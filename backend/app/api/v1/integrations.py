from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.models.export import UserIntegration
from app.schemas.export import IntegrationResponse
from app.api.deps import get_current_user
from app.config import settings

router = APIRouter()


@router.get("", response_model=list[IntegrationResponse])
async def list_integrations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's connected integrations."""
    query = select(UserIntegration).where(UserIntegration.user_id == current_user.id)
    result = await db.execute(query)
    integrations = result.scalars().all()

    # Build response with connected status
    providers = ["google", "notion"]
    integration_map = {i.provider: i for i in integrations}

    responses = []
    for provider in providers:
        if provider in integration_map:
            i = integration_map[provider]
            responses.append(
                IntegrationResponse(
                    provider=provider,
                    connected=True,
                    provider_user_id=i.provider_user_id,
                    updated_at=i.updated_at,
                )
            )
        else:
            responses.append(
                IntegrationResponse(
                    provider=provider,
                    connected=False,
                    provider_user_id=None,
                    updated_at=None,
                )
            )

    return responses


@router.get("/google/connect")
async def connect_google(
    current_user: User = Depends(get_current_user),
):
    """Initiate Google OAuth flow."""
    from google_auth_oauthlib.flow import Flow

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google integration not configured",
        )

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=[
            "https://www.googleapis.com/auth/documents",
            "https://www.googleapis.com/auth/drive.file",
            "openid",
            "email",
        ],
        redirect_uri=f"{settings.FRONTEND_URL}/api/auth/callback/google-integration",
    )

    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=str(current_user.id),
    )

    return {"auth_url": auth_url}


@router.post("/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback."""
    from google_auth_oauthlib.flow import Flow
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google integration not configured",
        )

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=[
            "https://www.googleapis.com/auth/documents",
            "https://www.googleapis.com/auth/drive.file",
            "openid",
            "email",
        ],
        redirect_uri=f"{settings.FRONTEND_URL}/api/auth/callback/google-integration",
    )

    flow.fetch_token(code=code)
    credentials = flow.credentials

    # Get user info
    oauth2_service = build("oauth2", "v2", credentials=credentials)
    user_info = oauth2_service.userinfo().get().execute()

    # Save or update integration
    user_id = state  # We passed user_id as state
    query = select(UserIntegration).where(
        UserIntegration.user_id == user_id,
        UserIntegration.provider == "google",
    )
    result = await db.execute(query)
    integration = result.scalar_one_or_none()

    if integration:
        integration.access_token = credentials.token
        integration.refresh_token = credentials.refresh_token
        integration.token_expires_at = credentials.expiry
        integration.provider_user_id = user_info.get("id")
        integration.integration_metadata = {"email": user_info.get("email")}
    else:
        integration = UserIntegration(
            user_id=user_id,
            provider="google",
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
            token_expires_at=credentials.expiry,
            scope=" ".join(credentials.scopes) if credentials.scopes else None,
            provider_user_id=user_info.get("id"),
            integration_metadata={"email": user_info.get("email")},
        )
        db.add(integration)

    await db.flush()

    return {"status": "connected", "provider": "google"}


@router.get("/notion/connect")
async def connect_notion(
    current_user: User = Depends(get_current_user),
):
    """Initiate Notion OAuth flow."""
    if not settings.NOTION_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Notion integration not configured",
        )

    auth_url = (
        f"https://api.notion.com/v1/oauth/authorize"
        f"?client_id={settings.NOTION_CLIENT_ID}"
        f"&response_type=code"
        f"&owner=user"
        f"&redirect_uri={settings.NOTION_REDIRECT_URI}"
        f"&state={current_user.id}"
    )

    return {"auth_url": auth_url}


@router.post("/notion/callback")
async def notion_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle Notion OAuth callback."""
    import httpx
    import base64

    if not settings.NOTION_CLIENT_ID or not settings.NOTION_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Notion integration not configured",
        )

    # Exchange code for token
    auth_string = f"{settings.NOTION_CLIENT_ID}:{settings.NOTION_CLIENT_SECRET}"
    encoded_auth = base64.b64encode(auth_string.encode()).decode()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.notion.com/v1/oauth/token",
            headers={
                "Authorization": f"Basic {encoded_auth}",
                "Content-Type": "application/json",
            },
            json={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.NOTION_REDIRECT_URI,
            },
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange code for token",
        )

    token_data = response.json()

    # Save or update integration
    user_id = state
    query = select(UserIntegration).where(
        UserIntegration.user_id == user_id,
        UserIntegration.provider == "notion",
    )
    result = await db.execute(query)
    integration = result.scalar_one_or_none()

    if integration:
        integration.access_token = token_data["access_token"]
        integration.provider_user_id = token_data.get("owner", {}).get("user", {}).get("id")
        integration.integration_metadata = {
            "workspace_name": token_data.get("workspace_name"),
            "workspace_id": token_data.get("workspace_id"),
        }
    else:
        integration = UserIntegration(
            user_id=user_id,
            provider="notion",
            access_token=token_data["access_token"],
            provider_user_id=token_data.get("owner", {}).get("user", {}).get("id"),
            integration_metadata={
                "workspace_name": token_data.get("workspace_name"),
                "workspace_id": token_data.get("workspace_id"),
            },
        )
        db.add(integration)

    await db.flush()

    return {"status": "connected", "provider": "notion"}


@router.delete("/{provider}")
async def disconnect_integration(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disconnect an integration."""
    if provider not in ["google", "notion"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid provider",
        )

    query = select(UserIntegration).where(
        UserIntegration.user_id == current_user.id,
        UserIntegration.provider == provider,
    )
    result = await db.execute(query)
    integration = result.scalar_one_or_none()

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        )

    await db.delete(integration)

    return {"status": "disconnected", "provider": provider}


@router.get("/google/folders")
async def list_google_folders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List Google Drive folders."""
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    query = select(UserIntegration).where(
        UserIntegration.user_id == current_user.id,
        UserIntegration.provider == "google",
    )
    integration = (await db.execute(query)).scalar_one_or_none()

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google not connected",
        )

    creds = Credentials(
        token=integration.access_token,
        refresh_token=integration.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
    )

    drive_service = build("drive", "v3", credentials=creds)
    results = drive_service.files().list(
        q="mimeType='application/vnd.google-apps.folder'",
        spaces="drive",
        fields="files(id, name)",
        pageSize=100,
    ).execute()

    return results.get("files", [])


@router.get("/notion/databases")
async def list_notion_databases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List Notion databases."""
    from notion_client import Client

    query = select(UserIntegration).where(
        UserIntegration.user_id == current_user.id,
        UserIntegration.provider == "notion",
    )
    integration = (await db.execute(query)).scalar_one_or_none()

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notion not connected",
        )

    notion = Client(auth=integration.access_token)
    # Search without filter and manually filter for databases
    response = notion.search()

    databases = [
        {
            "id": item["id"],
            "title": item["title"][0]["plain_text"] if item.get("title") else "Untitled",
            "url": item["url"],
        }
        for item in response.get("results", [])
        if item.get("object") == "database"
    ]

    return databases


@router.get("/notion/pages")
async def list_notion_pages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List Notion pages the integration has access to."""
    from notion_client import Client

    query = select(UserIntegration).where(
        UserIntegration.user_id == current_user.id,
        UserIntegration.provider == "notion",
    )
    integration = (await db.execute(query)).scalar_one_or_none()

    if not integration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notion not connected",
        )

    notion = Client(auth=integration.access_token)
    # Search and filter for pages using the correct filter syntax
    response = notion.search(filter={"property": "object", "value": "page"})

    pages = []
    for page in response.get("results", []):
        # Extract page title
        properties = page.get("properties", {})
        title_prop = properties.get("title") or properties.get("Name")
        title = "Untitled"
        if title_prop and title_prop.get("title"):
            title = title_prop["title"][0]["plain_text"] if title_prop["title"] else "Untitled"

        pages.append({
            "id": page["id"],
            "title": title,
            "url": page["url"],
        })

    return pages
