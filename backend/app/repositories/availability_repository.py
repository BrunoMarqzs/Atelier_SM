from datetime import datetime

from sqlalchemy import select, update

from app.models.availability_slot import AvailabilitySlot
from app.models.enums import AvailabilityStatus
from app.repositories.base import BaseRepository


class AvailabilityRepository(BaseRepository[AvailabilitySlot]):
    model = AvailabilitySlot

    async def get(self, slot_id: int) -> AvailabilitySlot | None:
        return await self.session.get(AvailabilitySlot, slot_id)

    async def get_for_update(self, slot_id: int) -> AvailabilitySlot | None:
        result = await self.session.execute(
            select(AvailabilitySlot).where(AvailabilitySlot.id == slot_id).with_for_update()
        )
        return result.scalar_one_or_none()

    async def list_between(self, starts_at: datetime, ends_at: datetime) -> list[AvailabilitySlot]:
        result = await self.session.execute(
            select(AvailabilitySlot)
            .where(
                AvailabilitySlot.starts_at >= starts_at,
                AvailabilitySlot.ends_at <= ends_at,
            )
            .order_by(AvailabilitySlot.starts_at)
        )
        return list(result.scalars().all())

    async def list_available_between(
        self, starts_at: datetime, ends_at: datetime
    ) -> list[AvailabilitySlot]:
        result = await self.session.execute(
            select(AvailabilitySlot)
            .where(
                AvailabilitySlot.starts_at >= starts_at,
                AvailabilitySlot.ends_at <= ends_at,
                AvailabilitySlot.status == AvailabilityStatus.AVAILABLE,
            )
            .order_by(AvailabilitySlot.starts_at)
        )
        return list(result.scalars().all())

    async def find_exact_window(
        self, starts_at: datetime, ends_at: datetime
    ) -> AvailabilitySlot | None:
        result = await self.session.execute(
            select(AvailabilitySlot).where(
                AvailabilitySlot.starts_at == starts_at,
                AvailabilitySlot.ends_at == ends_at,
            )
        )
        return result.scalar_one_or_none()

    async def reserve_available_slot(self, slot_id: int) -> AvailabilitySlot | None:
        result = await self.session.execute(
            update(AvailabilitySlot)
            .where(
                AvailabilitySlot.id == slot_id,
                AvailabilitySlot.status == AvailabilityStatus.AVAILABLE,
            )
            .values(status=AvailabilityStatus.BOOKED, reason=None)
            .returning(AvailabilitySlot)
        )
        return result.scalar_one_or_none()

    async def block_available_window(
        self,
        starts_at: datetime,
        ends_at: datetime,
        reason: str,
    ) -> AvailabilitySlot | None:
        result = await self.session.execute(
            update(AvailabilitySlot)
            .where(
                AvailabilitySlot.starts_at == starts_at,
                AvailabilitySlot.ends_at == ends_at,
                AvailabilitySlot.status == AvailabilityStatus.AVAILABLE,
            )
            .values(status=AvailabilityStatus.BLOCKED, reason=reason)
            .returning(AvailabilitySlot)
        )
        return result.scalar_one_or_none()

    async def release_blocked_window(
        self,
        starts_at: datetime,
        ends_at: datetime,
    ) -> AvailabilitySlot | None:
        result = await self.session.execute(
            update(AvailabilitySlot)
            .where(
                AvailabilitySlot.starts_at == starts_at,
                AvailabilitySlot.ends_at == ends_at,
                AvailabilitySlot.status == AvailabilityStatus.BLOCKED,
            )
            .values(status=AvailabilityStatus.AVAILABLE, reason=None)
            .returning(AvailabilitySlot)
        )
        return result.scalar_one_or_none()
