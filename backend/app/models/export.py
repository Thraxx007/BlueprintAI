import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models import Base


class Export(Base):
    __tablename__ = "exports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sops.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    export_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # google_docs, notion
    external_id: Mapped[str | None] = mapped_column(String(512))
    # Document ID in external service
    external_url: Mapped[str | None] = mapped_column(String(1024))
    # URL to exported document
    status: Mapped[str] = mapped_column(String(50), default="pending")
    # pending, in_progress, completed, error
    error_message: Mapped[str | None] = mapped_column(Text)
    export_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    # Export settings
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    sop: Mapped["SOP"] = relationship(back_populates="exports")
    user: Mapped["User"] = relationship(back_populates="exports")


class UserIntegration(Base):
    __tablename__ = "user_integrations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    # google, notion
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str | None] = mapped_column(Text)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scope: Mapped[str | None] = mapped_column(String(1024))
    provider_user_id: Mapped[str | None] = mapped_column(String(255))
    integration_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="integrations")

    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_integration_provider"),
    )


# Forward references
from app.models.sop import SOP
from app.models.user import User
