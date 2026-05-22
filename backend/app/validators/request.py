from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, computed_field

from app.config.settings import get_settings
from app.models.enums import AppointmentStatus, StorageProvider
from app.validators.availability import AvailabilitySlotRead
from app.validators.client import ClientIdentityInput, ClientProfileRead
from app.validators.common import ORMModel
from app.validators.service import ServiceRead


class AppointmentRequestCreate(BaseModel):
    client: ClientIdentityInput
    service_id: int = Field(gt=0)
    slot_id: int = Field(gt=0)
    notes: str | None = Field(default=None, max_length=2000)
    image_urls: list[str] = Field(default_factory=list, max_length=8)


class RequestImageRead(ORMModel):
    id: int
    storage_provider: StorageProvider
    url: str
    thumbnail_url: str | None
    public_id: str | None
    original_filename: str | None
    mime_type: str
    size_bytes: int


class StatusHistoryRead(ORMModel):
    id: int
    from_status: AppointmentStatus | None
    to_status: AppointmentStatus
    comment: str | None
    changed_by: str
    created_at: datetime


class AppointmentRequestRead(ORMModel):
    id: int
    client_id: int
    service_id: int
    slot_id: int
    public_code: str
    status: AppointmentStatus
    notes: str | None
    admin_comment: str | None
    estimated_price: Decimal | None
    images: list[RequestImageRead] = []
    status_history: list[StatusHistoryRead] = []
    client: ClientProfileRead | None = None
    service: ServiceRead | None = None
    slot: AvailabilitySlotRead | None = None

    @computed_field
    @property
    def public_url(self) -> str:
        base_url = get_settings().public_web_base_url.rstrip("/")
        return f"{base_url}/pedido/{self.public_code}"


class AppointmentStatusChangeInput(BaseModel):
    status: AppointmentStatus
    comment: str | None = Field(default=None, max_length=2000)
    estimated_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)


class AdminCommentInput(BaseModel):
    comment: str = Field(min_length=2, max_length=2000)


class AppointmentEstimateInput(BaseModel):
    estimated_price: Decimal = Field(ge=0, decimal_places=2)
    comment: str | None = Field(default=None, max_length=2000)


class AppointmentRescheduleInput(BaseModel):
    slot_id: int = Field(gt=0)
    comment: str | None = Field(default=None, max_length=2000)


class ClientAppointmentRescheduleInput(BaseModel):
    phone: str = Field(min_length=8, max_length=32)
    slot_id: int = Field(gt=0)
    comment: str | None = Field(default=None, max_length=2000)
