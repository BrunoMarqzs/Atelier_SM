from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.enums import AvailabilityStatus
from app.validators.common import ORMModel


class AvailabilitySlotCreate(BaseModel):
    starts_at: datetime
    ends_at: datetime
    status: AvailabilityStatus = AvailabilityStatus.AVAILABLE
    reason: str | None = Field(default=None, max_length=240)

    @model_validator(mode="after")
    def validate_window(self) -> "AvailabilitySlotCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("Horário final deve ser posterior ao inicial.")
        return self


class BlockSlotInput(BaseModel):
    starts_at: datetime
    ends_at: datetime
    reason: str = Field(min_length=2, max_length=240)

    @model_validator(mode="after")
    def validate_window(self) -> "BlockSlotInput":
        if self.ends_at <= self.starts_at:
            raise ValueError("Horário final deve ser posterior ao inicial.")
        return self


class ReleaseSlotInput(BaseModel):
    starts_at: datetime
    ends_at: datetime

    @model_validator(mode="after")
    def validate_window(self) -> "ReleaseSlotInput":
        if self.ends_at <= self.starts_at:
            raise ValueError("Horário final deve ser posterior ao inicial.")
        return self


class AvailabilitySlotRead(ORMModel):
    id: int
    starts_at: datetime
    ends_at: datetime
    status: AvailabilityStatus
    reason: str | None
