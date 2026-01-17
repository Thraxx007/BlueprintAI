from faster_whisper import WhisperModel
from pathlib import Path

from app.config import settings


class AudioTranscriber:
    """Service for transcribing audio files using Whisper (local model via faster-whisper)."""

    def __init__(self, model_size: str | None = None):
        """
        Initialize the transcriber with a Whisper model.

        Args:
            model_size: Whisper model size - 'tiny', 'base', 'small', 'medium', 'large-v3'
                       Larger models are more accurate but slower.
                       - tiny: fastest, lowest accuracy
                       - base: good balance (default)
                       - small: better accuracy
                       - medium: high accuracy
                       - large-v3: best accuracy
        """
        self.model_size = model_size or settings.WHISPER_MODEL_SIZE
        self._model = None

    @property
    def model(self):
        """Lazy load the Whisper model."""
        if self._model is None:
            # Use CPU with int8 quantization for efficiency
            self._model = WhisperModel(
                self.model_size,
                device="cpu",
                compute_type="int8",
            )
        return self._model

    def transcribe(self, audio_path: str, language: str | None = None) -> dict:
        """
        Transcribe an audio file to text.

        Args:
            audio_path: Path to the audio file
            language: Optional language code (e.g., 'en', 'es'). Auto-detected if not provided.

        Returns:
            Dict with transcription text and metadata
        """
        if not Path(audio_path).exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # Transcribe using local Whisper model
        kwargs = {}
        if language:
            kwargs["language"] = language

        segments, info = self.model.transcribe(audio_path, **kwargs)

        # Collect all segments
        segment_list = []
        full_text_parts = []

        for i, segment in enumerate(segments):
            segment_list.append({
                "id": i,
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
            })
            full_text_parts.append(segment.text.strip())

        return {
            "text": " ".join(full_text_parts),
            "language": info.language or language or "auto",
            "duration": info.duration,
            "segments": segment_list,
        }

    def transcribe_with_timestamps(self, audio_path: str, language: str | None = None) -> dict:
        """
        Transcribe audio with word-level timestamps.

        Useful for syncing text with audio playback.
        """
        if not Path(audio_path).exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        kwargs = {"word_timestamps": True}
        if language:
            kwargs["language"] = language

        segments, info = self.model.transcribe(audio_path, **kwargs)

        # Collect segments and words
        segment_list = []
        words = []
        full_text_parts = []

        for i, segment in enumerate(segments):
            segment_list.append({
                "id": i,
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
            })
            full_text_parts.append(segment.text.strip())

            # Extract word-level timestamps if available
            if segment.words:
                for word in segment.words:
                    words.append({
                        "word": word.word,
                        "start": word.start,
                        "end": word.end,
                    })

        return {
            "text": " ".join(full_text_parts),
            "language": info.language or language or "auto",
            "duration": info.duration,
            "words": words,
            "segments": segment_list,
        }
