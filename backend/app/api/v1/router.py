from fastapi import APIRouter

from app.api.v1 import videos, sops, exports, integrations, jobs, users, audio

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(videos.router, prefix="/videos", tags=["videos"])
api_router.include_router(sops.router, prefix="/sops", tags=["sops"])
api_router.include_router(audio.router, prefix="/audio", tags=["audio"])
api_router.include_router(exports.router, prefix="/exports", tags=["exports"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
