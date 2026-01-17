import subprocess
import json
from pathlib import Path
from datetime import datetime
from uuid import UUID

from app.workers.celery_app import celery_app
from app.db.session import SyncSessionLocal
from app.models.video import Video, Frame
from app.models.job import ProcessingJob
from app.config import settings


def update_job_progress(job_id: str, progress: int, message: str):
    """Update job progress in database."""
    db = SyncSessionLocal()
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == UUID(job_id)).first()
        if job:
            job.progress = progress
            job.progress_message = message
            db.commit()
    finally:
        db.close()


@celery_app.task(bind=True)
def process_video_task(self, video_id: str, user_id: str):
    """
    Main video processing pipeline:
    1. Extract metadata with FFprobe
    2. Detect scene changes with PySceneDetect
    3. Extract frames at scene changes
    """
    db = SyncSessionLocal()
    job = None

    try:
        # Create job record
        job = ProcessingJob(
            user_id=UUID(user_id),
            video_id=UUID(video_id),
            celery_task_id=self.request.id,
            job_type="video_processing",
            status="running",
            started_at=datetime.utcnow(),
        )
        db.add(job)
        db.commit()
        job_id = str(job.id)

        video = db.query(Video).filter(Video.id == UUID(video_id)).first()
        if not video:
            raise ValueError(f"Video not found: {video_id}")

        # Step 1: Extract metadata (20%)
        update_job_progress(job_id, 10, "Extracting video metadata...")
        metadata = extract_metadata(video.file_path)
        video.duration_seconds = metadata.get("duration")
        video.resolution_width = metadata.get("width")
        video.resolution_height = metadata.get("height")
        video.fps = metadata.get("fps")
        video.video_metadata = metadata
        video.status = "metadata_extracted"
        db.commit()
        update_job_progress(job_id, 20, "Metadata extracted")

        # Step 2: Detect scenes (50%)
        update_job_progress(job_id, 30, "Detecting scene changes...")
        scenes = detect_scenes(video.file_path)
        video.status = "scenes_detected"
        db.commit()
        update_job_progress(job_id, 50, f"Detected {len(scenes)} scenes")

        # Step 3: Extract frames (90%)
        update_job_progress(job_id, 60, "Extracting frames...")
        frames = extract_frames(video_id, user_id, video.file_path, scenes)

        # Save frames to database
        for frame_data in frames:
            frame = Frame(
                video_id=UUID(video_id),
                frame_number=frame_data["frame_number"],
                timestamp_ms=frame_data["timestamp_ms"],
                file_path=frame_data["file_path"],
                thumbnail_path=frame_data.get("thumbnail_path"),
                is_scene_change=frame_data.get("is_scene_change", False),
                scene_change_score=frame_data.get("score"),
                width=metadata.get("width"),
                height=metadata.get("height"),
            )
            db.add(frame)

        video.status = "processed"
        video.processed_date = datetime.utcnow()
        db.commit()
        update_job_progress(job_id, 90, f"Extracted {len(frames)} frames")

        # Complete job
        job.status = "completed"
        job.progress = 100
        job.progress_message = "Processing complete"
        job.completed_at = datetime.utcnow()
        db.commit()

        return {
            "status": "completed",
            "video_id": video_id,
            "frames_extracted": len(frames),
            "scenes_detected": len(scenes),
        }

    except Exception as e:
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()

        video = db.query(Video).filter(Video.id == UUID(video_id)).first()
        if video:
            video.status = "error"
            video.error_message = str(e)

        db.commit()
        raise

    finally:
        db.close()


def extract_metadata(file_path: str) -> dict:
    """Extract video metadata using FFprobe."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        file_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    probe = json.loads(result.stdout)

    # Find video stream
    video_stream = None
    for stream in probe.get("streams", []):
        if stream.get("codec_type") == "video":
            video_stream = stream
            break

    if not video_stream:
        raise ValueError("No video stream found")

    # Parse frame rate
    fps = None
    fps_str = video_stream.get("r_frame_rate", "0/1")
    if "/" in fps_str:
        num, den = fps_str.split("/")
        if int(den) > 0:
            fps = int(num) / int(den)

    return {
        "duration": float(probe["format"].get("duration", 0)),
        "width": video_stream.get("width"),
        "height": video_stream.get("height"),
        "fps": fps,
        "codec": video_stream.get("codec_name"),
        "bitrate": probe["format"].get("bit_rate"),
        "format": probe["format"].get("format_name"),
    }


def detect_scenes(file_path: str) -> list[dict]:
    """Detect scene changes using PySceneDetect."""
    from scenedetect import detect, AdaptiveDetector

    scene_list = detect(
        file_path,
        AdaptiveDetector(
            adaptive_threshold=3.0,
            min_scene_len=15,  # Minimum 15 frames per scene
        ),
    )

    scenes = []
    for i, (start, end) in enumerate(scene_list):
        scenes.append({
            "scene_index": i,
            "start_time": start.get_seconds(),
            "end_time": end.get_seconds(),
            "start_frame": start.get_frames(),
            "end_frame": end.get_frames(),
        })

    return scenes


def extract_frames(
    video_id: str,
    user_id: str,
    file_path: str,
    scenes: list[dict],
    interval_seconds: float = 1.0,
) -> list[dict]:
    """
    Extract frames at:
    1. Scene change points
    2. Regular intervals throughout the video

    This provides many more screenshots to choose from when editing SOPs.
    """
    frames_dir = settings.STORAGE_PATH / "frames" / user_id / video_id
    frames_dir.mkdir(parents=True, exist_ok=True)

    thumbnails_dir = settings.STORAGE_PATH / "thumbnails" / user_id / video_id
    thumbnails_dir.mkdir(parents=True, exist_ok=True)

    # Get video duration
    duration = get_video_duration(file_path)

    # Collect all timestamps to extract frames from
    timestamps_to_extract = set()

    # Add scene change timestamps
    for scene in scenes:
        timestamps_to_extract.add(scene["start_time"])

    # Add interval-based timestamps (every interval_seconds)
    current_time = 0.0
    while current_time < duration:
        timestamps_to_extract.add(round(current_time, 2))
        current_time += interval_seconds

    # Sort timestamps
    sorted_timestamps = sorted(timestamps_to_extract)

    # Create a set of scene change timestamps for quick lookup
    scene_timestamps = {round(s["start_time"], 2) for s in scenes}

    extracted = []

    for frame_num, timestamp in enumerate(sorted_timestamps):
        frame_path = frames_dir / f"frame_{frame_num:05d}.png"
        thumb_path = thumbnails_dir / f"thumb_{frame_num:05d}.png"

        is_scene_change = round(timestamp, 2) in scene_timestamps

        # Extract frame
        try:
            subprocess.run([
                "ffmpeg", "-y",
                "-ss", str(timestamp),
                "-i", file_path,
                "-vframes", "1",
                "-q:v", "2",
                str(frame_path),
            ], capture_output=True, check=True)

            # Create thumbnail
            subprocess.run([
                "ffmpeg", "-y",
                "-i", str(frame_path),
                "-vf", "scale=320:-1",
                str(thumb_path),
            ], capture_output=True, check=True)

            extracted.append({
                "frame_number": frame_num,
                "timestamp_ms": int(timestamp * 1000),
                "file_path": str(frame_path),
                "thumbnail_path": str(thumb_path),
                "is_scene_change": is_scene_change,
                "score": None,
            })
        except subprocess.CalledProcessError:
            # Skip frames that fail to extract
            continue

    return extracted


def get_video_duration(file_path: str) -> float:
    """Get video duration using FFprobe."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except (ValueError, AttributeError):
        return 0.0


@celery_app.task(bind=True)
def chop_video_task(self, video_id: str, user_id: str, segments: list[dict]):
    """Chop video into segments."""
    db = SyncSessionLocal()

    try:
        video = db.query(Video).filter(Video.id == UUID(video_id)).first()
        if not video:
            raise ValueError(f"Video not found: {video_id}")

        segments_dir = settings.STORAGE_PATH / "segments" / user_id / video_id
        segments_dir.mkdir(parents=True, exist_ok=True)

        from app.models.video import VideoSegment

        for i, seg in enumerate(segments):
            output_path = segments_dir / f"segment_{i:03d}.mp4"

            subprocess.run([
                "ffmpeg", "-y",
                "-i", video.file_path,
                "-ss", str(seg["start_time"]),
                "-to", str(seg["end_time"]),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                str(output_path),
            ], capture_output=True, check=True)

            # Update segment record
            segment = db.query(VideoSegment).filter(
                VideoSegment.video_id == UUID(video_id),
                VideoSegment.segment_index == i,
            ).first()

            if segment:
                segment.file_path = str(output_path)
                segment.status = "processed"

        db.commit()

        return {"status": "completed", "segments": len(segments)}

    finally:
        db.close()
