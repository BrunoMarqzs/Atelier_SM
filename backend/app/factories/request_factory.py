from decimal import Decimal

from app.models.appointment_request import AppointmentRequest
from app.models.enums import AppointmentStatus


class AppointmentRequestFactory:
    def create(
        self,
        *,
        client_id: int,
        service_id: int,
        slot_id: int,
        notes: str | None,
        estimated_price: Decimal | None,
        public_code: str,
    ) -> AppointmentRequest:
        return AppointmentRequest(
            client_id=client_id,
            service_id=service_id,
            slot_id=slot_id,
            notes=notes,
            estimated_price=estimated_price,
            public_code=public_code,
            status=AppointmentStatus.PENDING,
        )
