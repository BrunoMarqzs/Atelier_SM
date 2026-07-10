from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.validators.common import ORMModel

DEFAULT_WEEKLY_HOURS: dict[str, list[int]] = {
    "0": [480, 510, 540, 570, 600, 630, 840, 870, 900, 930, 960, 990, 1020],
    "1": [
        480,
        510,
        540,
        570,
        600,
        630,
        840,
        870,
        900,
        930,
        960,
        990,
        1020,
        1050,
        1080,
        1110,
        1140,
    ],
    "2": [480, 510, 540, 570, 600, 630, 840, 870, 900, 930, 960, 990, 1020],
    "3": [
        480,
        510,
        540,
        570,
        600,
        630,
        840,
        870,
        900,
        930,
        960,
        990,
        1020,
        1050,
        1080,
        1110,
        1140,
    ],
    "4": [
        480,
        510,
        540,
        570,
        600,
        630,
        840,
        870,
        900,
        930,
        960,
        990,
        1020,
        1050,
        1080,
        1110,
        1140,
    ],
    "5": [840, 870, 900, 930, 960],
    "6": [],
}
DEFAULT_LUNCH_BLOCK_HOURS = [660, 690, 720, 750, 780, 810]


def normalize_hours(hours: list[int]) -> list[int]:
    normalized = set()
    for hour in hours:
        if 0 <= hour <= 23:
            normalized.add(hour * 60)
        elif 0 <= hour <= 1439 and hour % 30 == 0:
            normalized.add(hour)
    return sorted(normalized)


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
