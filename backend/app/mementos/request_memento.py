from dataclasses import dataclass
from decimal import Decimal

from app.models.appointment_request import AppointmentRequest
from app.models.enums import AppointmentStatus


@dataclass(frozen=True)
class AppointmentRequestMemento:
    request_id: int
    status: AppointmentStatus
    admin_comment: str | None
    estimated_price: Decimal | None
    slot_id: int

    @classmethod
    def capture(cls, request: AppointmentRequest) -> "AppointmentRequestMemento":
        return cls(
            request_id=request.id,
            status=request.status,
            admin_comment=request.admin_comment,
            estimated_price=request.estimated_price,
            slot_id=request.slot_id,
        )

    def to_audit_snapshot(self) -> dict:
        return {
            "request_id": self.request_id,
            "status": self.status.value,
            "admin_comment": self.admin_comment,
            "estimated_price": str(self.estimated_price)
            if self.estimated_price is not None
            else None,
            "slot_id": self.slot_id,
        }
