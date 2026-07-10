from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.appointment_request import AppointmentRequest
from app.models.client_profile import ClientProfile
from app.models.enums import AppointmentStatus
from app.repositories.base import BaseRepository


class AppointmentRequestRepository(BaseRepository[AppointmentRequest]):
    model = AppointmentRequest

    async def get(self, request_id: int) -> AppointmentRequest | None:
        result = await self.session.execute(
            select(AppointmentRequest)
            .options(
                selectinload(AppointmentRequest.images),
                selectinload(AppointmentRequest.client),
                selectinload(AppointmentRequest.service),
                selectinload(AppointmentRequest.slot),
                selectinload(AppointmentRequest.status_history),
            )
            .where(AppointmentRequest.id == request_id)
        )
        return result.scalar_one_or_none()

    async def get_by_public_code(self, public_code: str) -> AppointmentRequest | None:
        result = await self.session.execute(
            select(AppointmentRequest)
            .options(
                selectinload(AppointmentRequest.images),
                selectinload(AppointmentRequest.client),
                selectinload(AppointmentRequest.service),
                selectinload(AppointmentRequest.slot),
                selectinload(AppointmentRequest.status_history),
            )
            .where(AppointmentRequest.public_code == public_code.upper())
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        status: AppointmentStatus | None = None,
        client_name: str | None = None,
        phone: str | None = None,
    ) -> list[AppointmentRequest]:
        statement = select(AppointmentRequest).options(
            selectinload(AppointmentRequest.images),
            selectinload(AppointmentRequest.client),
            selectinload(AppointmentRequest.service),
            selectinload(AppointmentRequest.slot),
            selectinload(AppointmentRequest.status_history),
        )
        if status:
            statement = statement.where(AppointmentRequest.status == status)
        if client_name or phone:
            statement = statement.join(AppointmentRequest.client)
        if client_name:
            statement = statement.where(ClientProfile.name.ilike(f"%{client_name}%"))
        if phone:
            statement = statement.where(ClientProfile.normalized_phone.contains(phone))
        result = await self.session.execute(
            statement.order_by(AppointmentRequest.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_by_client_phone(self, normalized_phone: str) -> list[AppointmentRequest]:
        result = await self.session.execute(
            select(AppointmentRequest)
            .join(AppointmentRequest.client)
            .options(
                selectinload(AppointmentRequest.images),
                selectinload(AppointmentRequest.client),
                selectinload(AppointmentRequest.service),
                selectinload(AppointmentRequest.slot),
                selectinload(AppointmentRequest.status_history),
            )
            .where(ClientProfile.normalized_phone == normalized_phone)
            .order_by(AppointmentRequest.created_at.desc())
        )
        return list(result.scalars().all())
