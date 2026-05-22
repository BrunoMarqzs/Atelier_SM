from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment_request import AppointmentRequest
from app.services.request_service import AppointmentRequestService
from app.validators.request import AppointmentRequestCreate


class BookingFacade:
    def __init__(self, session: AsyncSession) -> None:
        self.request_service = AppointmentRequestService(session)

    async def request_appointment(self, payload: AppointmentRequestCreate) -> AppointmentRequest:
        return await self.request_service.create(payload)
