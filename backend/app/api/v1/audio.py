import uuid
import aiofiles
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.audio import AudioFile
from app.models.sop import SOP, SOPStep
from app.schemas.sop import SOPResponse
from app.schemas.audio import (
    AudioUploadResponse,
    AudioFileResponse,
    AudioFileListResponse,
    AudioSOPGenerateRequest,
    AudioSOPListResponse,
    AudioSOPItem,
    CreateSOPFromAudioRequest,
    CreateSOPFromAudioResponse,
)
from app.api.deps import get_current_user
from app.config import settings
from app.workers.audio_tasks import generate_sop_from_audio_task, transcribe_audio_file_task

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


# ============ Audio Library Endpoints ============

@router.get("/library", response_model=AudioFileListResponse)
async def list_audio_library(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all audio files in the user's audio library.

    Returns audio files that have been uploaded, with their transcription status
    and the number of SOPs created from each.
    """
    # Count total
    count_query = select(func.count()).select_from(AudioFile).where(
        AudioFile.user_id == current_user.id
    )
    total = (await db.execute(count_query)).scalar()

    # Get audio files with SOP count
    query = (
        select(AudioFile)
        .where(AudioFile.user_id == current_user.id)
        .order_by(AudioFile.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    audio_files = result.scalars().all()

    # Get SOP counts for each audio file
    items = []
    for audio_file in audio_files:
        sop_count_query = select(func.count()).select_from(SOP).where(
            SOP.audio_file_id == audio_file.id
        )
        sop_count = (await db.execute(sop_count_query)).scalar()

        items.append(AudioFileResponse(
            id=audio_file.id,
            filename=audio_file.filename,
            original_filename=audio_file.original_filename,
            file_size=audio_file.file_size,
            duration_seconds=audio_file.duration_seconds,
            mime_type=audio_file.mime_type,
            transcript=audio_file.transcript,
            detected_language=audio_file.detected_language,
            transcription_status=audio_file.transcription_status,
            sop_count=sop_count,
            upload_date=audio_file.upload_date,
            created_at=audio_file.created_at,
            updated_at=audio_file.updated_at,
        ))

    return AudioFileListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/library/{audio_id}", response_model=AudioFileResponse)
async def get_audio_file(
    audio_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific audio file from the library."""
    query = select(AudioFile).where(
        AudioFile.id == audio_id,
        AudioFile.user_id == current_user.id
    )
    result = await db.execute(query)
    audio_file = result.scalar_one_or_none()

    if not audio_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file not found")

    # Get SOP count
    sop_count_query = select(func.count()).select_from(SOP).where(
        SOP.audio_file_id == audio_file.id
    )
    sop_count = (await db.execute(sop_count_query)).scalar()

    return AudioFileResponse(
        id=audio_file.id,
        filename=audio_file.filename,
        original_filename=audio_file.original_filename,
        file_size=audio_file.file_size,
        duration_seconds=audio_file.duration_seconds,
        mime_type=audio_file.mime_type,
        transcript=audio_file.transcript,
        detected_language=audio_file.detected_language,
        transcription_status=audio_file.transcription_status,
        sop_count=sop_count,
        upload_date=audio_file.upload_date,
        created_at=audio_file.created_at,
        updated_at=audio_file.updated_at,
    )


@router.delete("/library/{audio_id}")
async def delete_audio_file(
    audio_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete an audio file from the library.

    Note: This will NOT delete SOPs created from this audio file,
    but they will lose their link to the source audio.
    """
    query = select(AudioFile).where(
        AudioFile.id == audio_id,
        AudioFile.user_id == current_user.id
    )
    result = await db.execute(query)
    audio_file = result.scalar_one_or_none()

    if not audio_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file not found")

    # Delete the physical file
    file_path = Path(audio_file.file_path)
    if file_path.exists():
        file_path.unlink()

    # Delete from database
    await db.delete(audio_file)
    await db.flush()

    return {"status": "deleted", "message": "Audio file deleted successfully"}


@router.post("/upload", response_model=AudioUploadResponse)
async def upload_audio(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an audio file to the audio library.

    The audio file will be stored in your library and can be used
    to create multiple SOPs.
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

    # Determine mime type
    mime_types = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".ogg": "audio/ogg",
        ".webm": "audio/webm",
        ".mp4": "audio/mp4",
        ".mpeg": "audio/mpeg",
        ".mpga": "audio/mpeg",
    }
    mime_type = mime_types.get(file_ext, "audio/unknown")

    # Create AudioFile record
    audio_file = AudioFile(
        user_id=current_user.id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=file_size,
        mime_type=mime_type,
        transcription_status="transcribing",  # Start transcribing immediately
    )
    db.add(audio_file)
    await db.flush()

    # Trigger transcription task immediately
    transcribe_audio_file_task.delay(
        str(audio_file.id),
        str(file_path),
    )

    return AudioUploadResponse(
        audio_file_id=audio_file.id,
        audio_path=str(file_path),
        filename=unique_filename,
        original_filename=file.filename,
        file_size=file_size,
        message="Audio uploaded. Transcription in progress...",
    )


@router.post("/create-sop", response_model=CreateSOPFromAudioResponse)
async def create_sop_from_audio(
    request: CreateSOPFromAudioRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new SOP from an existing audio file in the library.

    This will:
    1. Transcribe the audio (if not already transcribed)
    2. Analyze the transcript with Claude to generate SOP steps
    3. Create the SOP structure
    """
    # Get the audio file
    query = select(AudioFile).where(
        AudioFile.id == request.audio_file_id,
        AudioFile.user_id == current_user.id
    )
    result = await db.execute(query)
    audio_file = result.scalar_one_or_none()

    if not audio_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file not found")

    # Verify file exists
    if not Path(audio_file.file_path).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file not found on disk",
        )

    # Create SOP record
    title = request.title or f"SOP - {audio_file.original_filename}"
    sop = SOP(
        user_id=current_user.id,
        audio_file_id=audio_file.id,
        title=title,
        description=request.description,
        user_context=request.user_context,
        status="generating",
        generation_metadata={
            "source": "audio",
            "audio_file_id": str(audio_file.id),
            "original_filename": audio_file.original_filename,
            "audio_path": audio_file.file_path,
            "file_size": audio_file.file_size,
            "detail_level": request.detail_level,
            "language": request.language,
        },
    )
    db.add(sop)
    await db.flush()

    # Queue the generation task
    task = generate_sop_from_audio_task.delay(
        str(sop.id),
        str(current_user.id),
        audio_file.file_path,
        {
            "detail_level": request.detail_level,
            "language": request.language,
            "audio_file_id": str(audio_file.id),
        },
    )

    return CreateSOPFromAudioResponse(
        sop_id=sop.id,
        audio_file_id=audio_file.id,
        title=title,
        status="generating",
        message="SOP generation started. This may take a few minutes.",
    )


# ============ Legacy Audio SOP Endpoints (for backward compatibility) ============

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

    Returns SOPs that were created from audio files.
    """
    # Base query - filter for audio source
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
            audio_file_id=sop.audio_file_id,
            created_at=sop.created_at,
            updated_at=sop.updated_at,
        ))

    return AudioSOPListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{sop_id}/generate", response_model=dict)
async def generate_sop_from_audio_legacy(
    sop_id: uuid.UUID,
    request: AudioSOPGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger SOP generation from uploaded audio (legacy endpoint).

    This endpoint is kept for backward compatibility.
    Use /audio/create-sop for new integrations.
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
