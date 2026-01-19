from datetime import datetime
from uuid import UUID

from app.workers.celery_app import celery_app
from app.db.session import SyncSessionLocal
from app.models.sop import SOP, SOPStep, ClickAnnotation
from app.models.video import Frame
from app.models.job import ProcessingJob
from app.services.claude_analyzer import ClaudeAnalyzer
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
def generate_sop_task(self, sop_id: str, user_id: str, options: dict):
    """
    Generate SOP steps using Claude AI:
    1. Get relevant frames from video
    2. Analyze frames to detect UI changes and actions
    3. Generate step descriptions
    4. Detect click locations
    5. Create annotated screenshots
    """
    db = SyncSessionLocal()
    job = None

    try:
        # Create job record
        job = ProcessingJob(
            user_id=UUID(user_id),
            sop_id=UUID(sop_id),
            celery_task_id=self.request.id,
            job_type="sop_generation",
            status="running",
            started_at=datetime.utcnow(),
        )
        db.add(job)
        db.commit()
        job_id = str(job.id)

        sop = db.query(SOP).filter(SOP.id == UUID(sop_id)).first()
        if not sop:
            raise ValueError(f"SOP not found: {sop_id}")

        if not sop.video_id:
            raise ValueError("SOP must be linked to a video")

        # Get frames for analysis
        update_job_progress(job_id, 10, "Loading frames...")

        # Build base query with timeframe filter
        def build_frames_query(scene_changes_only=False):
            query = db.query(Frame).filter(Frame.video_id == sop.video_id)

            # Filter by timeframe if specified
            if sop.start_time is not None:
                query = query.filter(
                    Frame.timestamp_ms >= int(sop.start_time * 1000)
                )
            if sop.end_time is not None:
                query = query.filter(
                    Frame.timestamp_ms <= int(sop.end_time * 1000)
                )

            if scene_changes_only:
                query = query.filter(Frame.is_scene_change == True)

            return query.order_by(Frame.frame_number)

        frames = []

        # Try scene change frames first if that's the strategy
        if options.get("frame_sampling_strategy") == "scene_changes":
            frames = build_frames_query(scene_changes_only=True).all()

        # Fall back to all frames if no scene change frames found in range
        if not frames:
            frames = build_frames_query(scene_changes_only=False).all()

        if not frames:
            raise ValueError("No frames found for analysis")

        max_steps = options.get("max_steps", 50)
        if len(frames) > max_steps:
            # Sample frames evenly
            step = len(frames) // max_steps
            frames = frames[::step][:max_steps]

        update_job_progress(job_id, 20, f"Analyzing {len(frames)} frames...")

        # Initialize Claude analyzer
        analyzer = ClaudeAnalyzer()

        # Process frames in batches
        batch_size = 10
        all_steps = []
        frame_paths = [f.file_path for f in frames]

        for i in range(0, len(frame_paths), batch_size):
            batch = frame_paths[i:i + batch_size]
            batch_frames = frames[i:i + batch_size]

            progress = 20 + int((i / len(frame_paths)) * 60)
            update_job_progress(
                job_id, progress, f"Analyzing batch {i // batch_size + 1}..."
            )

            # Analyze frame sequence
            steps = analyzer.analyze_frame_sequence(
                frame_paths=batch,
                user_context=sop.user_context or sop.description or sop.title,
                previous_steps=all_steps[-5:] if all_steps else None,
            )

            # Map steps to frames with validation
            for step in steps:
                frame_idx = step.get("frame_index", 0)

                # Validate frame_index is within batch bounds
                if not isinstance(frame_idx, int):
                    try:
                        frame_idx = int(frame_idx)
                    except (ValueError, TypeError):
                        frame_idx = 0

                # Clamp to valid range
                frame_idx = max(0, min(frame_idx, len(batch_frames) - 1))

                if batch_frames:
                    step["frame"] = batch_frames[frame_idx]
                    step["frame_index"] = frame_idx  # Store validated index

            all_steps.extend(steps)

        update_job_progress(job_id, 80, f"Creating {len(all_steps)} steps...")

        # Clear existing steps
        db.query(SOPStep).filter(SOPStep.sop_id == UUID(sop_id)).delete()

        # Create step records
        for i, step_data in enumerate(all_steps, start=1):
            frame = step_data.get("frame")

            sop_step = SOPStep(
                sop_id=UUID(sop_id),
                frame_id=frame.id if frame else None,
                step_number=i,
                title=step_data.get("title"),
                description=step_data.get("description", ""),
                screenshot_path=frame.file_path if frame else None,
                timestamp_ms=frame.timestamp_ms if frame else None,
            )
            db.add(sop_step)
            db.flush()  # Get step ID

            # Add click annotations
            click_loc = step_data.get("click_location")
            if click_loc and frame:
                # Validate and clamp percentages to 0-100 range
                x_pct = click_loc.get("x_percentage", 50)
                y_pct = click_loc.get("y_percentage", 50)
                try:
                    x_pct = max(0, min(100, float(x_pct)))
                    y_pct = max(0, min(100, float(y_pct)))
                except (ValueError, TypeError):
                    x_pct, y_pct = 50, 50

                annotation = ClickAnnotation(
                    step_id=sop_step.id,
                    x_coordinate=int(x_pct * frame.width / 100) if frame.width else 0,
                    y_coordinate=int(y_pct * frame.height / 100) if frame.height else 0,
                    x_percentage=x_pct,
                    y_percentage=y_pct,
                    click_type=click_loc.get("click_type", "left_click"),
                    element_description=click_loc.get("element_description"),
                    action_description=click_loc.get("action_description"),
                )
                db.add(annotation)

        # Update SOP
        sop.status = "completed"
        sop.total_steps = len(all_steps)
        db.commit()

        update_job_progress(job_id, 90, "Generating annotated screenshots...")

        # Generate annotated screenshots (with click markers)
        generate_annotated_screenshots(sop_id, db)

        # Complete job
        job.status = "completed"
        job.progress = 100
        job.progress_message = f"Generated {len(all_steps)} steps"
        job.completed_at = datetime.utcnow()
        db.commit()

        return {
            "status": "completed",
            "sop_id": sop_id,
            "steps_generated": len(all_steps),
        }

    except Exception as e:
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()

        sop = db.query(SOP).filter(SOP.id == UUID(sop_id)).first()
        if sop:
            sop.status = "error"
            sop.error_message = str(e)

        db.commit()
        raise

    finally:
        db.close()


def generate_annotated_screenshots(sop_id: str, db):
    """Generate screenshots with click marker overlays."""
    from PIL import Image, ImageDraw, ImageFont
    from pathlib import Path

    steps = (
        db.query(SOPStep)
        .filter(SOPStep.sop_id == UUID(sop_id))
        .all()
    )

    annotated_dir = settings.STORAGE_PATH / "annotated"
    annotated_dir.mkdir(parents=True, exist_ok=True)

    for step in steps:
        if not step.screenshot_path:
            continue

        annotations = (
            db.query(ClickAnnotation)
            .filter(ClickAnnotation.step_id == step.id)
            .order_by(ClickAnnotation.sequence_order)
            .all()
        )

        if not annotations:
            continue

        # Load original image
        img = Image.open(step.screenshot_path)
        draw = ImageDraw.Draw(img)

        # Draw click markers
        for i, ann in enumerate(annotations, start=1):
            x = int(ann.x_percentage * img.width / 100)
            y = int(ann.y_percentage * img.height / 100)

            # Draw circle with number
            radius = 20
            color = (255, 0, 0)  # Red

            # Outer circle
            draw.ellipse(
                [x - radius, y - radius, x + radius, y + radius],
                fill=color,
                outline=(255, 255, 255),
                width=2,
            )

            # Number in circle
            text = str(i)
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
            except Exception:
                font = ImageFont.load_default()

            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            draw.text(
                (x - text_width // 2, y - text_height // 2),
                text,
                fill=(255, 255, 255),
                font=font,
            )

        # Save annotated image
        annotated_path = annotated_dir / f"step_{step.id}.png"
        img.save(annotated_path)

        step.annotated_screenshot_path = str(annotated_path)

    db.commit()


@celery_app.task(bind=True)
def analyze_full_day_task(self, video_id: str, user_id: str, description: str):
    """
    Analyze a full-day recording and create multiple SOPs.
    1. Detect major workflow changes
    2. Cluster scenes into distinct workflows
    3. Create separate SOP for each workflow
    """
    db = SyncSessionLocal()

    try:
        from app.models.video import Video

        video = db.query(Video).filter(Video.id == UUID(video_id)).first()
        if not video:
            raise ValueError(f"Video not found: {video_id}")

        # Get all frames
        frames = (
            db.query(Frame)
            .filter(Frame.video_id == UUID(video_id), Frame.is_scene_change == True)
            .order_by(Frame.frame_number)
            .all()
        )

        if len(frames) < 10:
            # Not enough scenes for multiple SOPs
            return {"status": "skipped", "reason": "Not enough scenes for workflow clustering"}

        # Sample frames for clustering
        sample_step = max(1, len(frames) // 20)
        sample_frames = frames[::sample_step][:20]

        analyzer = ClaudeAnalyzer()

        # Cluster workflows
        workflows = analyzer.cluster_workflows(
            frame_paths=[f.file_path for f in sample_frames],
            user_description=description,
        )

        # Create SOP for each workflow
        sop_ids = []
        for workflow in workflows:
            sop = SOP(
                user_id=UUID(user_id),
                video_id=UUID(video_id),
                title=workflow.get("suggested_title", "Untitled SOP"),
                description=workflow.get("description"),
                user_context=description,
                status="draft",
            )
            db.add(sop)
            db.flush()
            sop_ids.append(str(sop.id))

        db.commit()

        # Queue generation for each SOP
        for sop_id in sop_ids:
            generate_sop_task.delay(
                sop_id,
                user_id,
                {"detail_level": "detailed", "max_steps": 30},
            )

        return {
            "status": "completed",
            "sops_created": len(sop_ids),
            "sop_ids": sop_ids,
        }

    finally:
        db.close()
