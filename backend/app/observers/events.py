from dataclasses import dataclass

from app.models.enums import AppointmentStatus


@dataclass(frozen=True)
class StatusChangedEvent:
    request_id: int
    from_status: AppointmentStatus | None
    to_status: AppointmentStatus
    comment: str | None
    changed_by: str
