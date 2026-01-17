from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class ExportCreate(BaseModel):
    sop_id: UUID
    export_type: str
    # google_docs, notion
    config: dict = {}
    # Export settings like folder_id for Google, database_id for Notion


class ExportResponse(BaseModel):
    id: UUID
    sop_id: UUID
    user_id: UUID
    export_type: str
    external_id: str | None
    external_url: str | None
    status: str
    error_message: str | None
    export_config: dict
    created_at: datetime
    completed_at: datetime | None

    class Config:
        from_attributes = True


class IntegrationResponse(BaseModel):
    provider: str
    connected: bool
    provider_user_id: str | None
    updated_at: datetime | None
