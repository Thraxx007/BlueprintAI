from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class ClickAnnotationCreate(BaseModel):
    x_coordinate: int
    y_coordinate: int
    x_percentage: float
    y_percentage: float
    click_type: str = "left_click"
    element_description: str | None = None
    action_description: str | None = None
    sequence_order: int = 1


class ClickAnnotationResponse(BaseModel):
    id: UUID
    step_id: UUID
    x_coordinate: int
    y_coordinate: int
    x_percentage: float
    y_percentage: float
    click_type: str
    element_description: str | None
    action_description: str | None
    sequence_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class SOPStepCreate(BaseModel):
    step_number: int
    title: str | None = None
    description: str
    screenshot_path: str | None = None
    timestamp_ms: int | None = None
    click_annotations: list[ClickAnnotationCreate] = []


class SOPStepUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    step_number: int | None = None
    screenshot_path: str | None = None


class SOPStepResponse(BaseModel):
    id: UUID
    sop_id: UUID
    frame_id: UUID | None
    step_number: int
    title: str | None
    description: str
    screenshot_path: str | None
    annotated_screenshot_path: str | None
    timestamp_ms: int | None
    created_at: datetime
    updated_at: datetime
    click_annotations: list[ClickAnnotationResponse] = []

    class Config:
        from_attributes = True


class SOPCreate(BaseModel):
    video_id: UUID | None = None
    segment_id: UUID | None = None
    title: str
    description: str | None = None
    user_context: str | None = None
    start_time: float | None = None
    end_time: float | None = None


class SOPUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    user_context: str | None = None


class SOPResponse(BaseModel):
    id: UUID
    user_id: UUID
    video_id: UUID | None
    segment_id: UUID | None
    title: str
    description: str | None
    user_context: str | None
    status: str
    start_time: float | None
    end_time: float | None
    total_steps: int
    generation_metadata: dict
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None
    steps: list[SOPStepResponse] = []

    class Config:
        from_attributes = True


class SOPListResponse(BaseModel):
    sops: list[SOPResponse]
    total: int
    page: int
    page_size: int


class SOPGenerateRequest(BaseModel):
    detail_level: str = "detailed"
    # brief, detailed, comprehensive
    include_keyboard_shortcuts: bool = True
    max_steps: int = 50
    frame_sampling_strategy: str = "scene_changes"
    # scene_changes, fixed_interval, adaptive


class SOPReorderRequest(BaseModel):
    step_ids: list[UUID]
    # Ordered list of step IDs
