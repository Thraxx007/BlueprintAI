import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.sop import SOP, SOPStep
from app.models.export import Export, UserIntegration
from app.schemas.export import ExportCreate, ExportResponse
from app.api.deps import get_current_user
from app.workers.export_tasks import export_to_notion_task
from app.services.pdf_exporter import PDFExporter

router = APIRouter()


@router.post("/notion", response_model=ExportResponse)
async def export_to_notion(
    request: ExportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export SOP to Notion."""
    # Verify SOP ownership
    sop_query = select(SOP).where(SOP.id == request.sop_id, SOP.user_id == current_user.id)
    sop = (await db.execute(sop_query)).scalar_one_or_none()
    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    # Check Notion integration
    integration_query = select(UserIntegration).where(
        UserIntegration.user_id == current_user.id,
        UserIntegration.provider == "notion",
    )
    integration = (await db.execute(integration_query)).scalar_one_or_none()
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notion account not connected. Please connect your Notion account first.",
        )

    # Create export record
    export = Export(
        sop_id=request.sop_id,
        user_id=current_user.id,
        export_type="notion",
        export_config=request.config,
        status="pending",
    )
    db.add(export)
    await db.flush()

    # Queue export task
    task = export_to_notion_task.delay(
        str(export.id),
        str(current_user.id),
    )

    export.status = "in_progress"
    await db.flush()

    return ExportResponse.model_validate(export)


@router.get("", response_model=list[ExportResponse])
async def list_exports(
    sop_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List export history."""
    query = select(Export).where(Export.user_id == current_user.id)

    if sop_id:
        query = query.where(Export.sop_id == sop_id)

    query = (
        query.order_by(Export.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(query)
    exports = result.scalars().all()

    return [ExportResponse.model_validate(e) for e in exports]


@router.get("/{export_id}", response_model=ExportResponse)
async def get_export(
    export_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get export status."""
    query = select(Export).where(Export.id == export_id, Export.user_id == current_user.id)
    result = await db.execute(query)
    export = result.scalar_one_or_none()

    if not export:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export not found")

    return ExportResponse.model_validate(export)


@router.post("/pdf/{sop_id}")
async def export_to_pdf(
    sop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export SOP to PDF and return as downloadable file."""
    # Verify SOP ownership
    sop_query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    sop = (await db.execute(sop_query)).scalar_one_or_none()
    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    # Get steps with click_annotations loaded
    steps_query = (
        select(SOPStep)
        .options(selectinload(SOPStep.click_annotations))
        .where(SOPStep.sop_id == sop_id)
        .order_by(SOPStep.step_number)
    )
    steps_result = await db.execute(steps_query)
    steps = steps_result.scalars().all()

    # Generate PDF
    try:
        exporter = PDFExporter()
        pdf_bytes = exporter.create_sop_pdf_bytes(sop, steps)

        # Create export record for tracking
        export = Export(
            sop_id=sop_id,
            user_id=current_user.id,
            export_type="pdf",
            export_config={},
            status="completed",
        )
        db.add(export)
        await db.flush()

        # Return PDF as downloadable file
        safe_title = "".join(c for c in sop.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_title = safe_title[:50].replace(' ', '_') or "sop"
        filename = f"{safe_title}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}",
        )
