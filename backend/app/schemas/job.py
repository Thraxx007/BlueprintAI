from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class JobResponse(BaseModel):
    id: UUID
    user_id: UUID
    video_id: UUID | None
    sop_id: UUID | None
    celery_task_id: str | None
    job_type: str
    status: str
    progress: int
    progress_message: str | None
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    metadata: dict
    created_at: datetime

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    jobs: list[JobResponse]
    total: int
