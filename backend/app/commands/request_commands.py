from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment_request import AppointmentRequest
from app.models.enums import AppointmentStatus
from app.services.request_service import AppointmentRequestService


class ChangeRequestStatusCommand:
    def __init__(self, session: AsyncSession) -> None:
        self.request_service = AppointmentRequestService(session)

    async def execute(
        self,
        *,
        request_id: int,
        status: AppointmentStatus,
        comment: str | None = None,
        estimated_price: Decimal | None = None,
    ) -> AppointmentRequest:
        return await self.request_service.change_status(
            request_id=request_id,
            target_status=status,
            comment=comment,
            estimated_price=estimated_price,
        )


class ApproveRequestCommand(ChangeRequestStatusCommand):
    async def execute(
        self,
        *,
        request_id: int,
        comment: str | None = None,
        estimated_price: Decimal | None = None,
    ) -> AppointmentRequest:
        return await self.request_service.change_status(
            request_id=request_id,
            target_status=AppointmentStatus.APPROVED,
            comment=comment,
            estimated_price=estimated_price,
        )


class RejectRequestCommand(ChangeRequestStatusCommand):
    async def execute(self, *, request_id: int, comment: str | None = None) -> AppointmentRequest:
        return await self.request_service.change_status(
            request_id=request_id,
            target_status=AppointmentStatus.REJECTED,
            comment=comment,
            estimated_price=None,
        )
