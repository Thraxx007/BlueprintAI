from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class AudioUploadResponse(BaseModel):
    sop_id: UUID
    audio_path: str
    filename: str
    file_size: int
    status: str
    message: str


class AudioSOPGenerateRequest(BaseModel):
    detail_level: str = "detailed"
    # brief, detailed, comprehensive
    language: str | None = None
    # Optional language code (e.g., 'en', 'es'). Auto-detected if not provided.
    user_context: str | None = None
    # Additional context about what the audio describes


class AudioSOPItem(BaseModel):
    """Audio SOP item for list response."""
    id: UUID
    title: str
    description: str | None
    status: str
    original_filename: str | None
    file_size: int | None
    total_steps: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AudioSOPListResponse(BaseModel):
    """List of audio SOPs with pagination."""
    items: list[AudioSOPItem]
    total: int
    page: int
    page_size: int
