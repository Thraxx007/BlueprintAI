from pydantic_settings import BaseSettings
from pydantic import field_validator
from pathlib import Path
from functools import lru_cache
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "BlueprintAI"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "your-secret-key-change-in-production"

    # Database - Railway provides DATABASE_URL in postgres:// format
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sop_creator"
    DATABASE_URL_SYNC: str = ""  # Will be derived from DATABASE_URL if not set

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def convert_database_url(cls, v: str) -> str:
        if not v:
            return "postgresql+asyncpg://postgres:postgres@localhost:5432/sop_creator"
        # Convert postgres:// to postgresql+asyncpg:// for SQLAlchemy async
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and "+asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("DATABASE_URL_SYNC", mode="before")
    @classmethod
    def convert_database_url_sync(cls, v: str, info) -> str:
        # If DATABASE_URL_SYNC is not set, derive from DATABASE_URL
        if not v:
            db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sop_creator")
            # Convert to sync format
            if db_url.startswith("postgres://"):
                return db_url.replace("postgres://", "postgresql://", 1)
            if "+asyncpg" in db_url:
                return db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
            return db_url
        # Ensure sync URL uses postgresql://
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        if "+asyncpg" in v:
            return v.replace("postgresql+asyncpg://", "postgresql://", 1)
        return v

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery - defaults to REDIS_URL if not explicitly set
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""

    @field_validator("CELERY_BROKER_URL", mode="before")
    @classmethod
    def set_celery_broker(cls, v: str) -> str:
        if not v:
            return os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        return v

    @field_validator("CELERY_RESULT_BACKEND", mode="before")
    @classmethod
    def set_celery_backend(cls, v: str) -> str:
        if not v:
            return os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        return v

    # Storage - use /app/storage for containers, local path for dev
    STORAGE_PATH: Path = Path(os.environ.get("STORAGE_PATH", "/app/storage"))
    MAX_VIDEO_SIZE_MB: int = 5000  # 5GB max
    ALLOWED_VIDEO_EXTENSIONS: list[str] = [".mp4", ".mov", ".avi", ".mkv", ".webm"]

    # Claude AI
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_VISION_MODEL: str = "claude-3-haiku-20240307"
    CLAUDE_TEXT_MODEL: str = "claude-3-haiku-20240307"

    # Whisper (local model for transcription - no API key needed)
    WHISPER_MODEL_SIZE: str = "base"  # tiny, base, small, medium, large

    # Audio settings
    ALLOWED_AUDIO_EXTENSIONS: list[str] = [".mp3", ".wav", ".m4a", ".ogg", ".webm", ".mp4", ".mpeg", ".mpga"]
    MAX_AUDIO_SIZE_MB: int = 25  # Whisper API limit

    # Google
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Notion
    NOTION_CLIENT_ID: str = ""
    NOTION_CLIENT_SECRET: str = ""
    NOTION_REDIRECT_URI: str = "http://localhost:3000/api/auth/callback/notion"

    # Public URL (for image serving)
    PUBLIC_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS - will be computed from FRONTEND_URL if not explicitly set
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def build_cors_origins(cls, v, info):
        if isinstance(v, str):
            # Handle JSON string or comma-separated
            if v.startswith("["):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
