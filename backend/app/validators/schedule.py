from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.validators.common import ORMModel

DEFAULT_WEEKLY_HOURS: dict[str, list[int]] = {
    "0": [8, 9, 10, 14, 15, 16, 17],
    "1": [8, 9, 10, 14, 15, 16, 17, 18, 19],
    "2": [8, 9, 10, 14, 15, 16, 17],
    "3": [8, 9, 10, 14, 15, 16, 17, 18, 19],
    "4": [8, 9, 10, 14, 15, 16, 17, 18, 19],
    "5": [14, 15, 16],
    "6": [],
}
DEFAULT_LUNCH_BLOCK_HOURS = [11, 12, 13]


def normalize_hours(hours: list[int]) -> list[int]:
    return sorted({hour for hour in hours if 0 <= hour <= 23})


class ScheduleConfigRead(ORMModel):
    id: int
    opening_time: str
    closing_time: str
    lunch_block_hours: list[int]
    weekly_hours: dict[str, list[int]]


class ScheduleConfigUpdate(BaseModel):
    opening_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    closing_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    lunch_block_hours: list[int] | None = None
    weekly_hours: dict[str, list[int]] | None = None

    @field_validator("lunch_block_hours")
    @classmethod
    def validate_lunch_hours(cls, value: list[int] | None) -> list[int] | None:
        return normalize_hours(value) if value is not None else None

    @field_validator("weekly_hours")
    @classmethod
    def validate_weekly_hours(
        cls, value: dict[str, list[int]] | None
    ) -> dict[str, list[int]] | None:
        if value is None:
            return None
        return {
            str(day): normalize_hours(hours)
            for day, hours in value.items()
            if str(day) in DEFAULT_WEEKLY_HOURS
        }


class ScheduleExceptionRead(ORMModel):
    id: int
    exception_date: date
    kind: str
    hours: list[int] | None
    reason: str | None


class ScheduleExceptionCreate(BaseModel):
    exception_date: date
    kind: str = Field(pattern=r"^(closed|special_hours)$")
    hours: list[int] | None = None
    reason: str | None = Field(default=None, max_length=240)

    @field_validator("hours")
    @classmethod
    def validate_hours(cls, value: list[int] | None) -> list[int] | None:
        return normalize_hours(value) if value is not None else None
