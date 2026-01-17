from celery import Celery

from app.config import settings

celery_app = Celery(
    "sop_creator",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.video_tasks",
        "app.workers.analysis_tasks",
        "app.workers.export_tasks",
        "app.workers.audio_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max per task
    worker_prefetch_multiplier=1,  # Process one task at a time
    task_acks_late=True,
)
