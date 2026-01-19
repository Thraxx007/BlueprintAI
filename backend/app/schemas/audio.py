from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


# ============ Audio Library Schemas ============

class AudioFileResponse(BaseModel):
    """Response for a single audio file in the library."""
    id: UUID
    filename: str
    original_filename: str
    file_size: int
    duration_seconds: float | None
    mime_type: str | None
    transcript: str | None
    detected_language: str | None
    transcription_status: str
    sop_count: int = 0  # Number of SOPs created from this audio
    upload_date: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AudioFileListResponse(BaseModel):
    """List of audio files with pagination."""
    items: list[AudioFileResponse]
    total: int
    page: int
    page_size: int


class AudioUploadResponse(BaseModel):
    """Response after uploading audio to the library."""
    audio_file_id: UUID
    audio_path: str
    filename: str
    original_filename: str
    file_size: int
    message: str


class CreateSOPFromAudioRequest(BaseModel):
    """Request to create a new SOP from an existing audio file."""
    audio_file_id: UUID
    title: str | None = None
    description: str | None = None
    detail_level: str = "detailed"
    language: str | None = None
    user_context: str | None = None


class CreateSOPFromAudioResponse(BaseModel):
    """Response after creating an SOP from audio."""
    sop_id: UUID
    audio_file_id: UUID
    title: str
    status: str
    message: str


# ============ Legacy Audio SOP Schemas (for backward compatibility) ============

class AudioSOPGenerateRequest(BaseModel):
    detail_level: str = "detailed"
    language: str | None = None
    user_context: str | None = None


class AudioSOPItem(BaseModel):
    """Audio SOP item for list response."""
    id: UUID
    title: str
    description: str | None
    status: str
    original_filename: str | None
    file_size: int | None
    total_steps: int
    audio_file_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AudioSOPListResponse(BaseModel):
    """List of audio SOPs with pagination."""
    items: list[AudioSOPItem]
    total: int
    page: int
    page_size: int
