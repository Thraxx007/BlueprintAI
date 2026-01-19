from datetime import datetime
from uuid import UUID

from app.workers.celery_app import celery_app
from app.db.session import SyncSessionLocal
from app.models.sop import SOP, SOPStep
from app.models.audio import AudioFile
from app.models.job import ProcessingJob
from app.services.audio_transcriber import AudioTranscriber
from app.services.claude_analyzer import ClaudeAnalyzer


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
def transcribe_audio_file_task(
    self,
    audio_file_id: str,
    audio_path: str,
    language: str | None = None,
):
    """
    Transcribe an audio file in the library.
    This runs automatically after upload to prepare the audio for SOP generation.
    """
    db = SyncSessionLocal()

    try:
        # Get the audio file record
        audio_file = db.query(AudioFile).filter(AudioFile.id == UUID(audio_file_id)).first()
        if not audio_file:
            raise ValueError(f"AudioFile not found: {audio_file_id}")

        # Update status to transcribing
        audio_file.transcription_status = "transcribing"
        db.commit()

        # Transcribe audio
        transcriber = AudioTranscriber()
        transcription = transcriber.transcribe(audio_path, language=language)

        # Update audio file with transcript data
        audio_file.transcript = transcription["text"]
        audio_file.detected_language = transcription.get("language")
        audio_file.duration_seconds = transcription.get("duration")
        audio_file.transcription_status = "transcribed"
        db.commit()

        return {
            "status": "completed",
            "audio_file_id": audio_file_id,
            "transcript_length": len(transcription["text"]),
            "duration_seconds": transcription.get("duration"),
            "detected_language": transcription.get("language"),
        }

    except Exception as e:
        # Update status to error
        audio_file = db.query(AudioFile).filter(AudioFile.id == UUID(audio_file_id)).first()
        if audio_file:
            audio_file.transcription_status = "error"
            audio_file.audio_metadata = {
                **audio_file.audio_metadata,
                "transcription_error": str(e),
            }
            db.commit()
        raise

    finally:
        db.close()


@celery_app.task(bind=True)
def generate_sop_from_audio_task(
    self,
    sop_id: str,
    user_id: str,
    audio_path: str,
    options: dict,
):
    """
    Generate SOP from audio file:
    1. Transcribe audio using Whisper
    2. Analyze transcript with Claude to generate structured SOP
    3. Create SOP steps
    """
    db = SyncSessionLocal()
    job = None

    try:
        # Create job record
        job = ProcessingJob(
            user_id=UUID(user_id),
            sop_id=UUID(sop_id),
            celery_task_id=self.request.id,
            job_type="audio_sop_generation",
            status="running",
            started_at=datetime.utcnow(),
        )
        db.add(job)
        db.commit()
        job_id = str(job.id)

        # Get the SOP
        sop = db.query(SOP).filter(SOP.id == UUID(sop_id)).first()
        if not sop:
            raise ValueError(f"SOP not found: {sop_id}")

        # Check if we have an existing transcript from the AudioFile
        audio_file_id = options.get("audio_file_id")
        audio_file = None
        transcript_text = None
        audio_duration = None
        detected_language = None

        if audio_file_id:
            audio_file = db.query(AudioFile).filter(AudioFile.id == UUID(audio_file_id)).first()
            if audio_file and audio_file.transcription_status == "transcribed" and audio_file.transcript:
                # Use existing transcript - skip transcription step
                update_job_progress(job_id, 10, "Using existing transcript...")
                transcript_text = audio_file.transcript
                audio_duration = audio_file.duration_seconds
                detected_language = audio_file.detected_language
                update_job_progress(job_id, 40, f"Transcript loaded ({len(transcript_text)} characters)")

        # If no existing transcript, transcribe now
        if not transcript_text:
            update_job_progress(job_id, 10, "Transcribing audio...")

            transcriber = AudioTranscriber()
            transcription = transcriber.transcribe(
                audio_path,
                language=options.get("language"),
            )

            transcript_text = transcription["text"]
            audio_duration = transcription.get("duration")
            detected_language = transcription.get("language")
            update_job_progress(job_id, 40, f"Transcription complete ({len(transcript_text)} characters)")

            # Update the AudioFile record if linked
            if audio_file:
                audio_file.transcript = transcript_text
                audio_file.detected_language = detected_language
                audio_file.duration_seconds = audio_duration
                audio_file.transcription_status = "transcribed"

        # Store transcript in SOP metadata
        sop.generation_metadata = {
            **sop.generation_metadata,
            "transcript": transcript_text,
            "audio_duration": audio_duration,
            "detected_language": detected_language,
        }

        db.commit()

        # Step 2: Generate SOP from transcript (80%)
        update_job_progress(job_id, 50, "Analyzing transcript and generating SOP...")

        analyzer = ClaudeAnalyzer()
        sop_data = analyzer.generate_sop_from_transcript(
            transcript=transcript_text,
            user_context=sop.user_context,
            detail_level=options.get("detail_level", "detailed"),
        )

        update_job_progress(job_id, 80, f"Generated {len(sop_data.get('steps', []))} steps")

        # Step 3: Create SOP steps (90%)
        update_job_progress(job_id, 85, "Creating SOP steps...")

        # Update SOP title and description if generated
        if sop_data.get("title") and not sop.title:
            sop.title = sop_data["title"]
        if sop_data.get("description") and not sop.description:
            sop.description = sop_data["description"]

        # Store additional metadata
        sop.generation_metadata = {
            **sop.generation_metadata,
            "notes": sop_data.get("notes", []),
            "estimated_time": sop_data.get("estimated_time"),
            "source": "audio",
        }

        # Create steps
        for step_data in sop_data.get("steps", []):
            step = SOPStep(
                sop_id=UUID(sop_id),
                step_number=step_data["step_number"],
                title=step_data.get("title"),
                description=step_data.get("description", ""),
            )
            db.add(step)

        sop.total_steps = len(sop_data.get("steps", []))
        sop.status = "generated"
        db.commit()

        update_job_progress(job_id, 90, "SOP generation complete")

        # Complete job
        job.status = "completed"
        job.progress = 100
        job.progress_message = "Audio SOP generation complete"
        job.completed_at = datetime.utcnow()
        db.commit()

        return {
            "status": "completed",
            "sop_id": sop_id,
            "steps_generated": len(sop_data.get("steps", [])),
            "transcript_length": len(transcript_text),
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
