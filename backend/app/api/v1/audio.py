import uuid
import os
import aiofiles
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.sop import SOP, SOPStep
from app.schemas.sop import SOPResponse
from app.schemas.audio import AudioUploadResponse, AudioSOPGenerateRequest, AudioSOPListResponse, AudioSOPItem
from app.api.deps import get_current_user
from app.config import settings
from app.workers.audio_tasks import generate_sop_from_audio_task

router = APIRouter()


def get_audio_storage_path(user_id: str, filename: str) -> Path:
    """Get the storage path for an audio file."""
    user_dir = settings.STORAGE_PATH / "audio" / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir / filename


def validate_audio_file(filename: str, file_size: int) -> None:
    """Validate audio file extension and size."""
    ext = Path(filename).suffix.lower()
    if ext not in settings.ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_AUDIO_EXTENSIONS)}",
        )

    max_bytes = settings.MAX_AUDIO_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_AUDIO_SIZE_MB}MB",
        )


@router.get("", response_model=AudioSOPListResponse)
async def list_audio_sops(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all audio-based SOPs for the current user.

    Returns SOPs that were created from audio file uploads.
    """
    # Base query - filter for audio source in generation_metadata
    query = select(SOP).where(
        SOP.user_id == current_user.id,
        SOP.generation_metadata["source"].as_string() == "audio",
    )
    count_query = select(func.count()).select_from(SOP).where(
        SOP.user_id == current_user.id,
        SOP.generation_metadata["source"].as_string() == "audio",
    )

    if status_filter:
        query = query.where(SOP.status == status_filter)
        count_query = count_query.where(SOP.status == status_filter)

    total = (await db.execute(count_query)).scalar()

    query = (
        query.order_by(SOP.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    sops = result.scalars().all()

    # Convert to response items
    items = []
    for sop in sops:
        metadata = sop.generation_metadata or {}
        items.append(AudioSOPItem(
            id=sop.id,
            title=sop.title,
            description=sop.description,
            status=sop.status,
            original_filename=metadata.get("original_filename"),
            file_size=metadata.get("file_size"),
            total_steps=sop.total_steps,
            created_at=sop.created_at,
            updated_at=sop.updated_at,
        ))

    return AudioSOPListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/upload", response_model=AudioUploadResponse)
async def upload_audio(
    file: UploadFile = File(...),
    title: str = Form(None),
    description: str = Form(None),
    user_context: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an audio file for SOP generation.

    Creates an SOP record and stores the audio file for processing.
    """
    # Get file size by reading content
    content = await file.read()
    file_size = len(content)

    # Validate
    validate_audio_file(file.filename, file_size)

    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    # Save file
    file_path = get_audio_storage_path(str(current_user.id), unique_filename)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Create SOP record
    sop = SOP(
        user_id=current_user.id,
        title=title or f"Audio SOP - {file.filename}",
        description=description,
        user_context=user_context,
        status="pending_audio",
        generation_metadata={
            "source": "audio",
            "original_filename": file.filename,
            "audio_path": str(file_path),
            "file_size": file_size,
        },
    )
    db.add(sop)
    await db.flush()

    return AudioUploadResponse(
        sop_id=sop.id,
        audio_path=str(file_path),
        filename=file.filename,
        file_size=file_size,
        status="uploaded",
        message="Audio uploaded successfully. Ready for SOP generation.",
    )


@router.post("/{sop_id}/generate", response_model=dict)
async def generate_sop_from_audio(
    sop_id: uuid.UUID,
    request: AudioSOPGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger SOP generation from uploaded audio.

    This will:
    1. Transcribe the audio using Whisper
    2. Analyze the transcript with Claude to generate SOP steps
    3. Create the SOP structure
    """
    query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    result = await db.execute(query)
    sop = result.scalar_one_or_none()

    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    # Verify this is an audio SOP
    if sop.generation_metadata.get("source") != "audio":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This SOP is not from an audio source",
        )

    if sop.status == "generating":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SOP is already being generated",
        )

    audio_path = sop.generation_metadata.get("audio_path")
    if not audio_path or not Path(audio_path).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file not found",
        )

    # Update status
    sop.status = "generating"
    sop.generation_metadata = {
        **sop.generation_metadata,
        "detail_level": request.detail_level,
        "language": request.language,
    }

    # Update context if provided
    if request.user_context:
        sop.user_context = request.user_context

    await db.flush()

    # Queue the generation task
    task = generate_sop_from_audio_task.delay(
        str(sop_id),
        str(current_user.id),
        audio_path,
        {
            "detail_level": request.detail_level,
            "language": request.language,
        },
    )

    return {
        "status": "generating",
        "task_id": task.id,
        "sop_id": str(sop_id),
        "message": "Audio SOP generation started. This may take a few minutes.",
    }


@router.get("/{sop_id}", response_model=SOPResponse)
async def get_audio_sop(
    sop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get an audio SOP with its generated steps."""
    query = (
        select(SOP)
        .where(SOP.id == sop_id, SOP.user_id == current_user.id)
        .options(selectinload(SOP.steps).selectinload(SOPStep.click_annotations))
    )
    result = await db.execute(query)
    sop = result.scalar_one_or_none()

    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    return SOPResponse.model_validate(sop)
