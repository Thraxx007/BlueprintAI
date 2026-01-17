from pydantic_settings import BaseSettings
from pathlib import Path
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SOP Creator"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "your-secret-key-change-in-production"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sop_creator"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/sop_creator"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Storage
    STORAGE_PATH: Path = Path("/Users/nicholasrussell/sop-creator/storage")
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

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
