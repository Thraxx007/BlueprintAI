import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Float, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models import Base


class AudioFile(Base):
    """Model for storing uploaded audio files in the audio library."""
    __tablename__ = "audio_files"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    mime_type: Mapped[str | None] = mapped_column(String(100))

    # Transcription data (populated after first transcription)
    transcript: Mapped[str | None] = mapped_column(Text)
    detected_language: Mapped[str | None] = mapped_column(String(10))
    transcription_status: Mapped[str] = mapped_column(String(50), default="pending")
    # Status: pending, transcribing, transcribed, error

    # Metadata
    audio_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Timestamps
    upload_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="audio_files")
    sops: Mapped[list["SOP"]] = relationship(back_populates="audio_file")


# Forward references
from app.models.user import User
from app.models.sop import SOP
