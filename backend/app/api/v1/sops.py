import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.video import Video
from app.models.sop import SOP, SOPStep, ClickAnnotation
from app.schemas.sop import (
    SOPCreate,
    SOPUpdate,
    SOPResponse,
    SOPListResponse,
    SOPGenerateRequest,
    SOPStepCreate,
    SOPStepUpdate,
    SOPStepResponse,
    ClickAnnotationCreate,
    ClickAnnotationResponse,
    SOPReorderRequest,
)
from app.api.deps import get_current_user
from app.workers.analysis_tasks import generate_sop_task

router = APIRouter()


@router.post("", response_model=SOPResponse)
async def create_sop(
    sop_data: SOPCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new SOP."""
    # Verify video ownership if video_id provided
    if sop_data.video_id:
        video_query = select(Video).where(
            Video.id == sop_data.video_id, Video.user_id == current_user.id
        )
        video = (await db.execute(video_query)).scalar_one_or_none()
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Video not found"
            )

    sop = SOP(
        user_id=current_user.id,
        video_id=sop_data.video_id,
        segment_id=sop_data.segment_id,
        title=sop_data.title,
        description=sop_data.description,
        user_context=sop_data.user_context,
        start_time=sop_data.start_time,
        end_time=sop_data.end_time,
        status="draft",
    )
    db.add(sop)
    await db.flush()

    # Reload with relationships
    query = (
        select(SOP)
        .where(SOP.id == sop.id)
        .options(selectinload(SOP.steps).selectinload(SOPStep.click_annotations))
    )
    result = await db.execute(query)
    sop = result.scalar_one()

    return SOPResponse.model_validate(sop)


@router.get("", response_model=SOPListResponse)
async def list_sops(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's SOPs."""
    # Base query
    query = select(SOP).where(SOP.user_id == current_user.id)
    count_query = select(func.count()).select_from(SOP).where(SOP.user_id == current_user.id)

    if status_filter:
        query = query.where(SOP.status == status_filter)
        count_query = count_query.where(SOP.status == status_filter)

    total = (await db.execute(count_query)).scalar()

    query = (
        query.options(selectinload(SOP.steps).selectinload(SOPStep.click_annotations))
        .order_by(SOP.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    sops = result.scalars().all()

    return SOPListResponse(
        sops=[SOPResponse.model_validate(s) for s in sops],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{sop_id}", response_model=SOPResponse)
async def get_sop(
    sop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get SOP details with steps."""
    query = (
        select(SOP)
        .where(SOP.id == sop_id, SOP.user_id == current_user.id)
        .options(selectinload(SOP.steps).selectinload(SOPStep.click_annotations))
    )
    result = await db.execute(query)
    sop = result.scalar_one_or_none()

    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    return SOPResponse.model_validate(sop)


@router.put("/{sop_id}", response_model=SOPResponse)
async def update_sop(
    sop_id: uuid.UUID,
    sop_data: SOPUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update SOP metadata."""
    query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    result = await db.execute(query)
    sop = result.scalar_one_or_none()

    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    if sop_data.title is not None:
        sop.title = sop_data.title
    if sop_data.description is not None:
        sop.description = sop_data.description
    if sop_data.user_context is not None:
        sop.user_context = sop_data.user_context

    await db.flush()

    # Reload with relationships
    await db.refresh(sop)
    query = (
        select(SOP)
        .where(SOP.id == sop_id)
        .options(selectinload(SOP.steps).selectinload(SOPStep.click_annotations))
    )
    result = await db.execute(query)
    sop = result.scalar_one()

    return SOPResponse.model_validate(sop)


@router.delete("/{sop_id}")
async def delete_sop(
    sop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an SOP."""
    query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    result = await db.execute(query)
    sop = result.scalar_one_or_none()

    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    await db.delete(sop)

    return {"status": "deleted"}


@router.post("/{sop_id}/generate", response_model=dict)
async def generate_sop(
    sop_id: uuid.UUID,
    request: SOPGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger AI generation for SOP steps."""
    query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    result = await db.execute(query)
    sop = result.scalar_one_or_none()

    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    if not sop.video_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SOP must be linked to a video for generation",
        )

    if sop.status == "generating":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SOP is already being generated",
        )

    # Update status
    sop.status = "generating"
    sop.generation_metadata = {
        "detail_level": request.detail_level,
        "include_keyboard_shortcuts": request.include_keyboard_shortcuts,
        "max_steps": request.max_steps,
        "frame_sampling_strategy": request.frame_sampling_strategy,
    }
    await db.flush()

    # Queue generation task
    task = generate_sop_task.delay(
        str(sop_id),
        str(current_user.id),
        request.model_dump(),
    )

    return {
        "status": "generating",
        "task_id": task.id,
        "sop_id": str(sop_id),
    }


@router.get("/{sop_id}/steps", response_model=list[SOPStepResponse])
async def get_sop_steps(
    sop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all steps for an SOP."""
    # Verify SOP ownership
    sop_query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    sop = (await db.execute(sop_query)).scalar_one_or_none()
    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    query = (
        select(SOPStep)
        .where(SOPStep.sop_id == sop_id)
        .options(selectinload(SOPStep.click_annotations))
        .order_by(SOPStep.step_number)
    )
    result = await db.execute(query)
    steps = result.scalars().all()

    return [SOPStepResponse.model_validate(s) for s in steps]


@router.post("/{sop_id}/steps", response_model=SOPStepResponse)
async def create_step(
    sop_id: uuid.UUID,
    step_data: SOPStepCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new step to an SOP."""
    # Verify SOP ownership
    sop_query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    sop = (await db.execute(sop_query)).scalar_one_or_none()
    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    # Get current max step number
    max_step_query = select(func.max(SOPStep.step_number)).where(SOPStep.sop_id == sop_id)
    max_step = (await db.execute(max_step_query)).scalar() or 0

    # If inserting at a specific position, shift existing steps
    insert_position = step_data.step_number if step_data.step_number else max_step + 1

    if step_data.step_number and step_data.step_number <= max_step:
        # Shift all steps at or after this position
        shift_query = (
            select(SOPStep)
            .where(SOPStep.sop_id == sop_id, SOPStep.step_number >= insert_position)
            .order_by(SOPStep.step_number.desc())
        )
        result = await db.execute(shift_query)
        steps_to_shift = result.scalars().all()
        for s in steps_to_shift:
            s.step_number += 1

    # Create the new step
    step = SOPStep(
        sop_id=sop_id,
        step_number=insert_position,
        title=step_data.title,
        description=step_data.description,
        screenshot_path=step_data.screenshot_path,
        timestamp_ms=step_data.timestamp_ms,
    )
    db.add(step)

    # Update total_steps
    sop.total_steps = max_step + 1

    await db.flush()

    # Reload with relationships
    query = (
        select(SOPStep)
        .where(SOPStep.id == step.id)
        .options(selectinload(SOPStep.click_annotations))
    )
    result = await db.execute(query)
    step = result.scalar_one()

    return SOPStepResponse.model_validate(step)


@router.put("/{sop_id}/steps/{step_id}", response_model=SOPStepResponse)
async def update_step(
    sop_id: uuid.UUID,
    step_id: uuid.UUID,
    step_data: SOPStepUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a step."""
    # Verify SOP ownership
    sop_query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    sop = (await db.execute(sop_query)).scalar_one_or_none()
    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    query = (
        select(SOPStep)
        .where(SOPStep.id == step_id, SOPStep.sop_id == sop_id)
        .options(selectinload(SOPStep.click_annotations))
    )
    result = await db.execute(query)
    step = result.scalar_one_or_none()

    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")

    if step_data.title is not None:
        step.title = step_data.title
    if step_data.description is not None:
        step.description = step_data.description
    if step_data.step_number is not None:
        step.step_number = step_data.step_number
    if step_data.screenshot_path is not None:
        step.screenshot_path = step_data.screenshot_path
        step.annotated_screenshot_path = None  # Clear annotated version when changing screenshot

    await db.flush()
    await db.refresh(step)

    return SOPStepResponse.model_validate(step)


@router.delete("/{sop_id}/steps/{step_id}")
async def delete_step(
    sop_id: uuid.UUID,
    step_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a step from an SOP."""
    # Verify SOP ownership
    sop_query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    sop = (await db.execute(sop_query)).scalar_one_or_none()
    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    # Get and delete the step
    query = select(SOPStep).where(SOPStep.id == step_id, SOPStep.sop_id == sop_id)
    result = await db.execute(query)
    step = result.scalar_one_or_none()

    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")

    deleted_step_number = step.step_number
    await db.delete(step)

    # Renumber remaining steps
    remaining_steps_query = (
        select(SOPStep)
        .where(SOPStep.sop_id == sop_id, SOPStep.step_number > deleted_step_number)
        .order_by(SOPStep.step_number)
    )
    result = await db.execute(remaining_steps_query)
    remaining_steps = result.scalars().all()

    for s in remaining_steps:
        s.step_number -= 1

    # Update total_steps on SOP
    sop.total_steps = max(0, sop.total_steps - 1)

    await db.flush()

    return {"status": "deleted"}


@router.post("/{sop_id}/steps/{step_id}/annotations", response_model=ClickAnnotationResponse)
async def add_annotation(
    sop_id: uuid.UUID,
    step_id: uuid.UUID,
    annotation_data: ClickAnnotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a click annotation to a step."""
    # Verify SOP ownership
    sop_query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    sop = (await db.execute(sop_query)).scalar_one_or_none()
    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    # Verify step exists
    step_query = select(SOPStep).where(SOPStep.id == step_id, SOPStep.sop_id == sop_id)
    step = (await db.execute(step_query)).scalar_one_or_none()
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")

    annotation = ClickAnnotation(
        step_id=step_id,
        x_coordinate=annotation_data.x_coordinate,
        y_coordinate=annotation_data.y_coordinate,
        x_percentage=annotation_data.x_percentage,
        y_percentage=annotation_data.y_percentage,
        click_type=annotation_data.click_type,
        element_description=annotation_data.element_description,
        action_description=annotation_data.action_description,
        sequence_order=annotation_data.sequence_order,
    )
    db.add(annotation)
    await db.flush()

    return ClickAnnotationResponse.model_validate(annotation)


@router.delete("/{sop_id}/steps/{step_id}/annotations/{annotation_id}")
async def remove_annotation(
    sop_id: uuid.UUID,
    step_id: uuid.UUID,
    annotation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a click annotation."""
    # Verify SOP ownership
    sop_query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    sop = (await db.execute(sop_query)).scalar_one_or_none()
    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    query = select(ClickAnnotation).where(
        ClickAnnotation.id == annotation_id, ClickAnnotation.step_id == step_id
    )
    result = await db.execute(query)
    annotation = result.scalar_one_or_none()

    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Annotation not found"
        )

    await db.delete(annotation)

    return {"status": "deleted"}


@router.delete("/{sop_id}/steps/{step_id}/annotations")
async def clear_all_annotations(
    sop_id: uuid.UUID,
    step_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove all click annotations from a step."""
    # Verify SOP ownership
    sop_query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    sop = (await db.execute(sop_query)).scalar_one_or_none()
    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    # Verify step exists
    step_query = select(SOPStep).where(SOPStep.id == step_id, SOPStep.sop_id == sop_id)
    step = (await db.execute(step_query)).scalar_one_or_none()
    if not step:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found")

    # Delete all annotations for this step
    query = select(ClickAnnotation).where(ClickAnnotation.step_id == step_id)
    result = await db.execute(query)
    annotations = result.scalars().all()

    for annotation in annotations:
        await db.delete(annotation)

    return {"status": "deleted", "count": len(annotations)}


@router.post("/{sop_id}/reorder", response_model=list[SOPStepResponse])
async def reorder_steps(
    sop_id: uuid.UUID,
    request: SOPReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder SOP steps."""
    # Verify SOP ownership
    sop_query = select(SOP).where(SOP.id == sop_id, SOP.user_id == current_user.id)
    sop = (await db.execute(sop_query)).scalar_one_or_none()
    if not sop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOP not found")

    # Update step numbers
    for i, step_id in enumerate(request.step_ids, start=1):
        query = select(SOPStep).where(SOPStep.id == step_id, SOPStep.sop_id == sop_id)
        result = await db.execute(query)
        step = result.scalar_one_or_none()
        if step:
            step.step_number = i

    await db.flush()

    # Return updated steps
    query = (
        select(SOPStep)
        .where(SOPStep.sop_id == sop_id)
        .options(selectinload(SOPStep.click_annotations))
        .order_by(SOPStep.step_number)
    )
    result = await db.execute(query)
    steps = result.scalars().all()

    return [SOPStepResponse.model_validate(s) for s in steps]
