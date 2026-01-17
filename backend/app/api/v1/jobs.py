import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.user import User
from app.models.job import ProcessingJob
from app.schemas.job import JobResponse, JobListResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.get("", response_model=JobListResponse)
async def list_jobs(
    status_filter: str | None = None,
    job_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's processing jobs."""
    query = select(ProcessingJob).where(ProcessingJob.user_id == current_user.id)
    count_query = (
        select(func.count())
        .select_from(ProcessingJob)
        .where(ProcessingJob.user_id == current_user.id)
    )

    if status_filter:
        query = query.where(ProcessingJob.status == status_filter)
        count_query = count_query.where(ProcessingJob.status == status_filter)

    if job_type:
        query = query.where(ProcessingJob.job_type == job_type)
        count_query = count_query.where(ProcessingJob.job_type == job_type)

    total = (await db.execute(count_query)).scalar()

    query = (
        query.order_by(ProcessingJob.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(query)
    jobs = result.scalars().all()

    return JobListResponse(
        jobs=[JobResponse.model_validate(j) for j in jobs],
        total=total,
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get job status."""
    query = select(ProcessingJob).where(
        ProcessingJob.id == job_id, ProcessingJob.user_id == current_user.id
    )
    result = await db.execute(query)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return JobResponse.model_validate(job)


@router.delete("/{job_id}")
async def cancel_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a running job."""
    query = select(ProcessingJob).where(
        ProcessingJob.id == job_id, ProcessingJob.user_id == current_user.id
    )
    result = await db.execute(query)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.status not in ["queued", "running"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel job in state: {job.status}",
        )

    # Revoke Celery task if exists
    if job.celery_task_id:
        from app.workers.celery_app import celery_app

        celery_app.control.revoke(job.celery_task_id, terminate=True)

    job.status = "cancelled"
    await db.flush()

    return {"status": "cancelled"}
