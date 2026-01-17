from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.config import settings
from app.api.v1.router import api_router
from app.db.session import engine
from app.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Ensure storage directories exist
    settings.STORAGE_PATH.mkdir(parents=True, exist_ok=True)
    (settings.STORAGE_PATH / "videos").mkdir(exist_ok=True)
    (settings.STORAGE_PATH / "frames").mkdir(exist_ok=True)
    (settings.STORAGE_PATH / "thumbnails").mkdir(exist_ok=True)
    (settings.STORAGE_PATH / "exports").mkdir(exist_ok=True)

    yield

    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Automatic SOP Creator from Screen Recordings",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for serving images
app.mount("/static", StaticFiles(directory=str(settings.STORAGE_PATH)), name="static")

# API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}
