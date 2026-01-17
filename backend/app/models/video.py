import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Float, Integer, BigInteger, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models import Base


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    resolution_width: Mapped[int | None] = mapped_column(Integer)
    resolution_height: Mapped[int | None] = mapped_column(Integer)
    fps: Mapped[float | None] = mapped_column(Float)
    mime_type: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), default="uploaded", index=True)
    # Status: uploaded, processing, metadata_extracted, scenes_detected, frames_extracted, processed, error
    upload_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    processed_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    video_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="videos")
    segments: Mapped[list["VideoSegment"]] = relationship(
        back_populates="video", cascade="all, delete-orphan"
    )
    frames: Mapped[list["Frame"]] = relationship(back_populates="video", cascade="all, delete-orphan")
    sops: Mapped[list["SOP"]] = relationship(back_populates="video")


class VideoSegment(Base):
    __tablename__ = "video_segments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    segment_index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    file_path: Mapped[str | None] = mapped_column(String(1024))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    # Status: pending, processing, processed, error
    title: Mapped[str | None] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    video: Mapped["Video"] = relationship(back_populates="segments")
    frames: Mapped[list["Frame"]] = relationship(back_populates="segment")
    sops: Mapped[list["SOP"]] = relationship(back_populates="segment")


class Frame(Base):
    __tablename__ = "frames"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    segment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("video_segments.id", ondelete="SET NULL")
    )
    frame_number: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp_ms: Mapped[int] = mapped_column(BigInteger, nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    thumbnail_path: Mapped[str | None] = mapped_column(String(1024))
    is_scene_change: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    scene_change_score: Mapped[float | None] = mapped_column(Float)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    analysis_status: Mapped[str] = mapped_column(String(50), default="pending")
    # Status: pending, analyzed, error
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    video: Mapped["Video"] = relationship(back_populates="frames")
    segment: Mapped["VideoSegment | None"] = relationship(back_populates="frames")
    sop_steps: Mapped[list["SOPStep"]] = relationship(back_populates="frame")


# Forward references
from app.models.user import User
from app.models.sop import SOP, SOPStep
