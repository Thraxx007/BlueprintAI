# BlueprintAI

An AI-powered technical documentation and Standard Operating Procedure (SOP) creation tool. Upload screen recordings or audio files and automatically generate step-by-step blueprints with screenshots and annotations.

## Features

### Input Methods
- **Video Upload**: Upload screen recordings (MP4, MOV, AVI, MKV, WebM up to 5GB)
- **Audio Upload**: Upload audio recordings (MP3, WAV, M4A, OGG, FLAC) for voice-narrated SOPs
- **Full-Day Recording Support**: Upload long recordings and automatically split into multiple blueprints
- **Video Segment Selection**: Manually select specific portions of videos for targeted blueprint creation

### AI-Powered Analysis
- **Automatic Scene Detection**: Detects UI changes, clicks, and actions in video recordings
- **Audio Transcription**: Transcribes audio recordings using OpenAI Whisper
- **Smart Step Generation**: Claude AI generates professional documentation with:
  - Screenshots at each step (for video)
  - Detailed step descriptions
  - Click markers showing where to click
  - Contextual instructions based on audio narration

### Export Options
- **PDF Export**: Export blueprints as professionally formatted PDF documents with embedded images
- **Notion Export**: Export directly to Notion with full formatting, images, and structured content

### User Experience
- **Blueprint-Themed UI**: Tech-forward design with light and dark mode support
- **Real-Time Progress**: Track processing and generation progress with detailed status updates
- **Step Editor**: Review and edit generated steps, update descriptions, and modify annotations

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Python FastAPI, Celery, Redis
- **Database**: PostgreSQL
- **AI**: Claude API (Haiku for vision analysis, Sonnet for descriptions), OpenAI Whisper for transcription
- **Video Processing**: FFmpeg, PySceneDetect
- **PDF Generation**: ReportLab

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Anthropic API key
- OpenAI API key (for audio transcription)
- (Optional) Notion OAuth credentials for Notion export

### Setup

1. Clone the repository:

```bash
git clone https://github.com/Thraxx007/BlueprintAI.git
cd BlueprintAI
```

2. Copy the environment file and add your API keys:

```bash
cp .env.example .env
# Edit .env and add your API keys
```

3. Start the application with Docker Compose:

```bash
docker-compose up -d
```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Development Setup (without Docker)

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install poetry
poetry install

# Start PostgreSQL and Redis (or use Docker for just these)
docker-compose up -d postgres redis

# Run migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload

# Start Celery worker (in another terminal)
celery -A app.workers.celery_app worker --loglevel=info
```

#### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Usage

### 1. Upload Content

#### Video Upload
Navigate to Videos → Upload and drag your screen recording. The video will be processed to:
- Extract metadata (duration, resolution, FPS)
- Detect scene changes
- Extract frames at key moments

#### Audio Upload
Navigate to Audio → Upload and drag your audio recording. The audio will be:
- Transcribed using OpenAI Whisper
- Analyzed for step-by-step instructions
- Ready for blueprint generation

### 2. Create a Blueprint

1. Go to Blueprints → Create Blueprint
2. Select a processed video or audio file
3. Enter a title and description
4. Provide context for the AI (what the recording demonstrates)
5. Click "Generate Blueprint"

The AI will analyze the content and generate:
- Step-by-step instructions
- Screenshots for each step (video only)
- Click markers showing where actions occurred
- Contextual descriptions based on narration

### 3. Review and Edit

View your generated blueprint and make edits:
- Update step descriptions
- Add or remove click annotations
- Reorder steps
- Modify titles and context

### 4. Export

Export your blueprint to:
- **PDF**: Creates a professionally formatted PDF document with embedded images and structured content
- **Notion**: Creates a Notion page with rich formatting, images, and organized steps

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Claude API key for AI analysis | Yes |
| `OPENAI_API_KEY` | OpenAI API key for audio transcription | Yes |
| `SECRET_KEY` | Backend secret for JWT authentication | Yes |
| `NEXTAUTH_SECRET` | Frontend auth secret | Yes |
| `NOTION_CLIENT_ID` | Notion OAuth client ID | For Notion export |
| `NOTION_CLIENT_SECRET` | Notion OAuth secret | For Notion export |

### Processing Options

- **Frame Sampling**: `scene_changes` (default), `fixed_interval`, `adaptive`
- **Detail Level**: `brief`, `detailed`, `comprehensive`
- **Max Steps**: Configure maximum steps per blueprint (default: 50)

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation.

Key endpoints:

### Videos
- `POST /api/v1/videos/upload` - Upload video
- `POST /api/v1/videos/{id}/process` - Process video
- `GET /api/v1/videos` - List all videos
- `GET /api/v1/videos/{id}` - Get video details

### Audio
- `POST /api/v1/audio/upload` - Upload audio file
- `POST /api/v1/audio/{id}/transcribe` - Transcribe audio
- `GET /api/v1/audio` - List all audio files
- `GET /api/v1/audio/{id}` - Get audio details

### Blueprints (SOPs)
- `POST /api/v1/sops` - Create blueprint
- `POST /api/v1/sops/{id}/generate` - Generate blueprint steps
- `GET /api/v1/sops` - List all blueprints
- `GET /api/v1/sops/{id}` - Get blueprint details
- `PUT /api/v1/sops/{id}` - Update blueprint

### Exports
- `POST /api/v1/exports/pdf` - Export to PDF
- `POST /api/v1/exports/notion` - Export to Notion
- `GET /api/v1/exports` - List all exports
- `GET /api/v1/exports/{id}/download` - Download export file

### Integrations
- `GET /api/v1/integrations/notion/status` - Check Notion connection status
- `DELETE /api/v1/integrations/notion` - Disconnect Notion

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js       │────▶│   FastAPI       │────▶│   Celery        │
│   Frontend      │     │   Backend       │     │   Workers       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   PostgreSQL    │     │   Claude AI     │
                        │   + Redis       │     │   + Whisper     │
                        └─────────────────┘     └─────────────────┘
```

## Screenshots

### Landing Page
The blueprint-themed landing page with light and dark mode support.

### Dashboard
Manage your videos, audio files, and blueprints from the sidebar navigation.

### Blueprint Editor
Review and edit generated steps with inline editing capabilities.

### Export Options
Export to PDF or Notion with a single click.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
