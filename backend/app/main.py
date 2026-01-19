from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

from app.config import settings
from app.api.v1.router import api_router
from app.db.session import engine
from app.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting BlueprintAI...")
    logger.info(f"DATABASE_URL configured: {bool(settings.DATABASE_URL)}")
    logger.info(f"REDIS_URL configured: {bool(settings.REDIS_URL)}")

    # Startup: Create tables if they don't exist
    try:
        logger.info("Connecting to database...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        # Don't crash - allow health check to work

    # Ensure storage directories exist
    try:
        settings.STORAGE_PATH.mkdir(parents=True, exist_ok=True)
        (settings.STORAGE_PATH / "videos").mkdir(exist_ok=True)
        (settings.STORAGE_PATH / "frames").mkdir(exist_ok=True)
        (settings.STORAGE_PATH / "thumbnails").mkdir(exist_ok=True)
        (settings.STORAGE_PATH / "exports").mkdir(exist_ok=True)
        (settings.STORAGE_PATH / "audio").mkdir(exist_ok=True)
        (settings.STORAGE_PATH / "annotated").mkdir(exist_ok=True)
        logger.info(f"Storage directories ready at {settings.STORAGE_PATH}")
    except Exception as e:
        logger.error(f"Failed to create storage directories: {e}")

    logger.info("BlueprintAI startup complete!")
    yield

    # Shutdown
    logger.info("Shutting down BlueprintAI...")
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered technical documentation from screen recordings",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - Allow frontend origin
cors_origins = settings.CORS_ORIGINS
# Also add frontend URL if set and not already in list
if settings.FRONTEND_URL and settings.FRONTEND_URL not in cors_origins:
    cors_origins = cors_origins + [settings.FRONTEND_URL]
logger.info(f"CORS origins: {cors_origins}")
logger.info(f"FRONTEND_URL: {settings.FRONTEND_URL}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for serving images - only mount if directory exists
try:
    settings.STORAGE_PATH.mkdir(parents=True, exist_ok=True)
    app.mount("/static", StaticFiles(directory=str(settings.STORAGE_PATH)), name="static")
    logger.info(f"Static files mounted at /static -> {settings.STORAGE_PATH}")
except Exception as e:
    logger.warning(f"Could not mount static files: {e}")

# API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Root endpoint for basic connectivity check."""
    return {"app": settings.APP_NAME, "status": "running", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint for Railway/container orchestration."""
    return {"status": "healthy", "app": settings.APP_NAME}


@app.get("/debug/cors")
async def debug_cors():
    """Debug endpoint to check CORS configuration."""
    return {
        "cors_origins": settings.CORS_ORIGINS,
        "frontend_url": settings.FRONTEND_URL,
        "public_url": settings.PUBLIC_URL,
    }
