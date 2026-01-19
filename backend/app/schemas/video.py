from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class VideoCreate(BaseModel):
    title: str | None = None


class VideoSegmentResponse(BaseModel):
    id: UUID
    video_id: UUID
    segment_index: int
    start_time: float
    end_time: float
    file_path: str | None
    status: str
    title: str | None
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class FrameResponse(BaseModel):
    id: UUID
    video_id: UUID
    segment_id: UUID | None
    frame_number: int
    timestamp_ms: int
    file_path: str
    thumbnail_path: str | None
    is_scene_change: bool
    scene_change_score: float | None
    width: int | None
    height: int | None
    analysis_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class VideoResponse(BaseModel):
    id: UUID
    user_id: UUID
    filename: str
    original_filename: str
    file_size: int
    duration_seconds: float | None
    resolution_width: int | None
    resolution_height: int | None
    fps: float | None
    mime_type: str | None
    status: str
    upload_date: datetime
    processed_date: datetime | None
    video_metadata: dict
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    segments: list[VideoSegmentResponse] = []
    frame_count: int = 0

    class Config:
        from_attributes = True


class VideoListResponse(BaseModel):
    videos: list[VideoResponse]
    total: int
    page: int
    page_size: int


class SegmentDefinition(BaseModel):
    """Definition for a single video segment."""
    start_time: float
    end_time: float
    title: str | None = None
    label: str | None = None  # Alias for title, used by frontend
    color: str | None = None  # UI color hint


class VideoChopRequest(BaseModel):
    """Request to create multiple segments on a video."""
    segments: list[SegmentDefinition]


class VideoProcessRequest(BaseModel):
    start_time: float | None = None
    end_time: float | None = None
    frame_sampling_strategy: str = "scene_changes"
    # scene_changes, fixed_interval, adaptive
