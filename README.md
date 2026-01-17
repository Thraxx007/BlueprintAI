# SOP Creator

An automatic Standard Operating Procedure (SOP) creation tool powered by Claude AI. Upload screen recordings and automatically generate step-by-step documentation with screenshots and click markers.

## Features

- **Video Upload**: Upload screen recordings (MP4, MOV, AVI, MKV, WebM up to 5GB)
- **AI-Powered Analysis**: Claude AI automatically detects UI changes, clicks, and actions
- **Step-by-Step SOPs**: Generate professional documentation with:
  - Screenshots at each step
  - Detailed step descriptions
  - Click markers showing where to click
- **Export Options**: Export to Google Docs or Notion with full formatting
- **Full-Day Recording Support**: Upload long recordings and automatically split into multiple SOPs
- **Video Chopping**: Manually split videos into segments for targeted SOP creation

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Python FastAPI, Celery, Redis
- **Database**: PostgreSQL
- **AI**: Claude API (Haiku for vision, Sonnet for descriptions)
- **Video Processing**: FFmpeg, PySceneDetect

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Anthropic API key
- (Optional) Google OAuth credentials for Google Docs export
- (Optional) Notion OAuth credentials for Notion export

### Setup

1. Clone the repository and navigate to the project directory:

```bash
cd sop-creator
```

2. Copy the environment file and add your API keys:

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
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

### 1. Upload a Video

Navigate to Videos → Upload and drag your screen recording. The video will be processed to:
- Extract metadata (duration, resolution, FPS)
- Detect scene changes
- Extract frames at key moments

### 2. Create an SOP

1. Go to SOPs → Create SOP
2. Select a processed video
3. Enter a title and description
4. Provide context for the AI (what the video demonstrates)
5. Click "Generate SOP"

The AI will analyze the video frames and generate:
- Step-by-step instructions
- Screenshots for each step
- Click markers showing where actions occurred

### 3. Review and Edit

View your generated SOP and make edits:
- Update step descriptions
- Add or remove click annotations
- Reorder steps

### 4. Export

Export your SOP to:
- **Google Docs**: Creates a formatted document with images
- **Notion**: Creates a page with rich formatting

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Claude API key | Yes |
| `SECRET_KEY` | Backend secret for JWT | Yes |
| `NEXTAUTH_SECRET` | Frontend auth secret | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google export |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | For Google export |
| `NOTION_CLIENT_ID` | Notion OAuth client ID | For Notion export |
| `NOTION_CLIENT_SECRET` | Notion OAuth secret | For Notion export |

### Video Processing Options

- **Frame Sampling**: `scene_changes` (default), `fixed_interval`, `adaptive`
- **Detail Level**: `brief`, `detailed`, `comprehensive`
- **Max Steps**: Configure maximum steps per SOP (default: 50)

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation.

Key endpoints:
- `POST /api/v1/videos/upload` - Upload video
- `POST /api/v1/videos/{id}/process` - Process video
- `POST /api/v1/sops` - Create SOP
- `POST /api/v1/sops/{id}/generate` - Generate SOP steps
- `POST /api/v1/exports/google-docs` - Export to Google Docs
- `POST /api/v1/exports/notion` - Export to Notion

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
                        │   + Redis       │     │   API           │
                        └─────────────────┘     └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
