import uuid
import aiofiles
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.video import Video, VideoSegment, Frame
from app.schemas.video import (
    VideoResponse,
    VideoListResponse,
    VideoChopRequest,
    VideoSegmentResponse,
    FrameResponse,
)
from app.api.deps import get_current_user
from app.config import settings
from app.workers.video_tasks import process_video_task

router = APIRouter()


def get_safe_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal."""
    return "".join(c for c in filename if c.isalnum() or c in "._-")


@router.post("/upload", response_model=VideoResponse)
async def upload_video(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a new video file."""
    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {settings.ALLOWED_VIDEO_EXTENSIONS}",
        )

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{ext}"
    user_dir = settings.STORAGE_PATH / "videos" / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    file_path = user_dir / unique_filename

    # Stream write to disk
    file_size = 0
    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            await f.write(chunk)
            file_size += len(chunk)

            # Check file size limit
            if file_size > settings.MAX_VIDEO_SIZE_MB * 1024 * 1024:
                # Clean up and raise error
                file_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File too large. Max size: {settings.MAX_VIDEO_SIZE_MB}MB",
                )

    # Create database record
    video = Video(
        user_id=current_user.id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=file_size,
        mime_type=file.content_type,
        status="uploaded",
    )
    db.add(video)
    await db.flush()

    # Reload with relationships for response
    await db.refresh(video)
    query = (
        select(Video)
        .where(Video.id == video.id)
        .options(selectinload(Video.segments))
    )
    result = await db.execute(query)
    video = result.scalar_one()

    return VideoResponse.model_validate(video)


@router.get("", response_model=VideoListResponse)
async def list_videos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's videos."""
    # Get total count
    count_query = select(func.count()).select_from(Video).where(Video.user_id == current_user.id)
    total = (await db.execute(count_query)).scalar()

    # Get videos
    query = (
        select(Video)
        .where(Video.user_id == current_user.id)
        .options(selectinload(Video.segments))
        .order_by(Video.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    videos = result.scalars().all()

    # Get frame counts
    video_responses = []
    for video in videos:
        frame_count_query = select(func.count()).select_from(Frame).where(Frame.video_id == video.id)
        frame_count = (await db.execute(frame_count_query)).scalar()
        video_dict = VideoResponse.model_validate(video).model_dump()
        video_dict["frame_count"] = frame_count
        video_responses.append(VideoResponse(**video_dict))

    return VideoListResponse(
        videos=video_responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get video details."""
    query = (
        select(Video)
        .where(Video.id == video_id, Video.user_id == current_user.id)
        .options(selectinload(Video.segments))
    )
    result = await db.execute(query)
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    # Get frame count
    frame_count_query = select(func.count()).select_from(Frame).where(Frame.video_id == video.id)
    frame_count = (await db.execute(frame_count_query)).scalar()

    video_dict = VideoResponse.model_validate(video).model_dump()
    video_dict["frame_count"] = frame_count

    return VideoResponse(**video_dict)


@router.delete("/{video_id}")
async def delete_video(
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a video and its associated files."""
    query = select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    result = await db.execute(query)
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    # Delete file
    file_path = Path(video.file_path)
    if file_path.exists():
        file_path.unlink()

    # Delete from database (cascade will delete related records)
    await db.delete(video)

    return {"status": "deleted"}


@router.post("/{video_id}/process", response_model=dict)
async def trigger_video_processing(
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger video processing (metadata extraction, scene detection, frame extraction)."""
    query = select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    result = await db.execute(query)
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    if video.status not in ["uploaded", "error"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video cannot be processed in current state: {video.status}",
        )

    # Update status
    video.status = "processing"
    await db.flush()

    # Queue processing task
    task = process_video_task.delay(str(video_id), str(current_user.id))

    return {
        "status": "processing",
        "task_id": task.id,
        "video_id": str(video_id),
    }


@router.post("/{video_id}/segments", response_model=list[VideoSegmentResponse])
async def save_video_segments(
    video_id: uuid.UUID,
    request: VideoChopRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save multiple segments for a video. This replaces any existing segments."""
    query = select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    result = await db.execute(query)
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    # Delete existing segments
    existing_segments = await db.execute(
        select(VideoSegment).where(VideoSegment.video_id == video_id)
    )
    for seg in existing_segments.scalars().all():
        await db.delete(seg)

    # Create new segment records
    segments = []
    for i, seg in enumerate(request.segments):
        # Use label as title if title not provided
        title = seg.title or seg.label
        segment = VideoSegment(
            video_id=video_id,
            segment_index=i,
            start_time=seg.start_time,
            end_time=seg.end_time,
            title=title,
            status="saved",
        )
        db.add(segment)
        segments.append(segment)

    await db.flush()

    return [VideoSegmentResponse.model_validate(s) for s in segments]


@router.post("/{video_id}/chop", response_model=list[VideoSegmentResponse])
async def chop_video(
    video_id: uuid.UUID,
    request: VideoChopRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Split video into segments (legacy endpoint)."""
    query = select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    result = await db.execute(query)
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    # Create segment records
    segments = []
    for i, seg in enumerate(request.segments):
        title = seg.title or seg.label
        segment = VideoSegment(
            video_id=video_id,
            segment_index=i,
            start_time=seg.start_time,
            end_time=seg.end_time,
            title=title,
            status="pending",
        )
        db.add(segment)
        segments.append(segment)

    await db.flush()

    return [VideoSegmentResponse.model_validate(s) for s in segments]


@router.get("/{video_id}/segments", response_model=list[VideoSegmentResponse])
async def get_video_segments(
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get video segments."""
    # Verify video ownership
    video_query = select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    video = (await db.execute(video_query)).scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    query = (
        select(VideoSegment)
        .where(VideoSegment.video_id == video_id)
        .order_by(VideoSegment.segment_index)
    )
    result = await db.execute(query)
    segments = result.scalars().all()

    return [VideoSegmentResponse.model_validate(s) for s in segments]


@router.get("/{video_id}/frames", response_model=list[FrameResponse])
async def get_video_frames(
    video_id: uuid.UUID,
    scene_changes_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get extracted frames from a video."""
    # Verify video ownership
    video_query = select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    video = (await db.execute(video_query)).scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    query = select(Frame).where(Frame.video_id == video_id)

    if scene_changes_only:
        query = query.where(Frame.is_scene_change == True)

    query = (
        query.order_by(Frame.frame_number)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(query)
    frames = result.scalars().all()

    return [FrameResponse.model_validate(f) for f in frames]


@router.get("/{video_id}/stream")
async def stream_video(
    video_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stream video file."""
    query = select(Video).where(Video.id == video_id, Video.user_id == current_user.id)
    result = await db.execute(query)
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    file_path = Path(video.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file not found")

    return FileResponse(
        path=file_path,
        media_type=video.mime_type or "video/mp4",
        filename=video.original_filename,
    )
