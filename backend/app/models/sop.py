import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Float, Integer, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models import Base


class SOP(Base):
    __tablename__ = "sops"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    video_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("videos.id", ondelete="SET NULL"), index=True
    )
    segment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("video_segments.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    user_context: Mapped[str | None] = mapped_column(Text)
    # Brief description provided by user to guide AI SOP creation
    status: Mapped[str] = mapped_column(String(50), default="draft", index=True)
    # Status: draft, generating, completed, error
    start_time: Mapped[float | None] = mapped_column(Float)
    # If specific timeframe selected
    end_time: Mapped[float | None] = mapped_column(Float)
    total_steps: Mapped[int] = mapped_column(Integer, default=0)
    generation_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    # AI generation params, model used, etc.
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    user: Mapped["User"] = relationship(back_populates="sops")
    video: Mapped["Video | None"] = relationship(back_populates="sops")
    segment: Mapped["VideoSegment | None"] = relationship(back_populates="sops")
    steps: Mapped[list["SOPStep"]] = relationship(
        back_populates="sop", cascade="all, delete-orphan", order_by="SOPStep.step_number"
    )
    exports: Mapped[list["Export"]] = relationship(back_populates="sop", cascade="all, delete-orphan")


class SOPStep(Base):
    __tablename__ = "sop_steps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sops.id", ondelete="CASCADE"), nullable=False, index=True
    )
    frame_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("frames.id", ondelete="SET NULL")
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    screenshot_path: Mapped[str | None] = mapped_column(String(1024))
    annotated_screenshot_path: Mapped[str | None] = mapped_column(String(1024))
    # Screenshot with click markers
    timestamp_ms: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    sop: Mapped["SOP"] = relationship(back_populates="steps")
    frame: Mapped["Frame | None"] = relationship(back_populates="sop_steps")
    click_annotations: Mapped[list["ClickAnnotation"]] = relationship(
        back_populates="step", cascade="all, delete-orphan", order_by="ClickAnnotation.sequence_order"
    )


class ClickAnnotation(Base):
    __tablename__ = "click_annotations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    step_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sop_steps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    x_coordinate: Mapped[int] = mapped_column(Integer, nullable=False)
    # Pixel position
    y_coordinate: Mapped[int] = mapped_column(Integer, nullable=False)
    x_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    # Percentage for responsive display
    y_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    click_type: Mapped[str] = mapped_column(String(50), default="left_click")
    # left_click, right_click, double_click, hover
    element_description: Mapped[str | None] = mapped_column(String(512))
    # AI-detected element description
    action_description: Mapped[str | None] = mapped_column(String(512))
    # What the click does
    sequence_order: Mapped[int] = mapped_column(Integer, default=1)
    # For multiple clicks in one step
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    step: Mapped["SOPStep"] = relationship(back_populates="click_annotations")


# Forward references
from app.models.user import User
from app.models.video import Video, VideoSegment, Frame
from app.models.export import Export
