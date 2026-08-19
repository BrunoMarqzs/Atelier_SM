from datetime import date, datetime, time, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.availability_slot import AvailabilitySlot
from app.models.enums import AvailabilityStatus
from app.repositories.availability_repository import AvailabilityRepository
from app.services.schedule_policy_service import SchedulePolicyService
from app.utils.errors import ConflictError, NotFoundError
from app.utils.schedule_rules import (
    allowed_hours_for_date,
    is_allowed_slot_start,
    minute_of_day,
    slot_time_from_minutes,
    to_atelier_datetime,
)
from app.validators.availability import AvailabilitySlotCreate, BlockSlotInput, ReleaseSlotInput

SLOT_MINUTES = 30


class AvailabilityService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = AvailabilityRepository(session)
        self.schedule_policy = SchedulePolicyService(session)

    async def list_available(
        self, starts_at: datetime, ends_at: datetime
    ) -> list[AvailabilitySlot]:
        return await self._list_for_window(starts_at, ends_at, keep_booked_on_closed_days=False)

    async def list_for_admin(
        self, starts_at: datetime, ends_at: datetime
    ) -> list[AvailabilitySlot]:
        return await self._list_for_window(starts_at, ends_at, keep_booked_on_closed_days=True)

    async def _list_for_window(
        self,
        starts_at: datetime,
        ends_at: datetime,
        *,
        keep_booked_on_closed_days: bool,
    ) -> list[AvailabilitySlot]:
        await self.ensure_business_slots(starts_at, ends_at)
        slots = await self.repository.list_between(starts_at, ends_at)
        allowed_minutes_by_date: dict[date, set[int]] = {}
        filtered_slots = []
        for slot in slots:
            atelier_start = to_atelier_datetime(slot.starts_at)
            allowed_minutes = allowed_minutes_by_date.get(atelier_start.date())
            if allowed_minutes is None:
                allowed_minutes = await self.schedule_policy.allowed_hours_for_date(slot.starts_at)
                allowed_minutes_by_date[atelier_start.date()] = allowed_minutes
            allowed = minute_of_day(atelier_start) in allowed_minutes
            valid_duration = slot.ends_at - slot.starts_at == timedelta(minutes=SLOT_MINUTES)
            keep_existing_booking = (
                keep_booked_on_closed_days and slot.status == AvailabilityStatus.BOOKED
            )
            if (allowed and valid_duration) or keep_existing_booking:
                filtered_slots.append(slot)
        return sorted(filtered_slots, key=lambda slot: slot.starts_at)

    async def ensure_business_slots(self, starts_at: datetime, ends_at: datetime) -> None:
        cursor = datetime.combine(starts_at.date(), time(hour=0), tzinfo=starts_at.tzinfo)
        end_day = ends_at.date()

        while cursor.date() <= end_day:
            for slot_minute in await self.schedule_policy.allowed_hours_for_date(cursor):
                hour, minute = slot_time_from_minutes(slot_minute)
                slot_start = datetime.combine(
                    cursor.date(), time(hour=hour, minute=minute), tzinfo=starts_at.tzinfo
                )
                slot_end = slot_start + timedelta(minutes=SLOT_MINUTES)
                if slot_start < starts_at or slot_end > ends_at:
                    continue
                existing = await self.repository.find_exact_window(slot_start, slot_end)
                if not existing:
                    await self.repository.add(
                        AvailabilitySlot(
                            starts_at=slot_start,
                            ends_at=slot_end,
                            status=AvailabilityStatus.AVAILABLE,
                        )
                    )
            cursor += timedelta(days=1)

        try:
            await self.repository.session.flush()
        except IntegrityError as exc:
            raise ConflictError("Horários já foram materializados por outra transação.") from exc

    async def create_slot(self, payload: AvailabilitySlotCreate) -> AvailabilitySlot:
        await self.validate_business_window_async(payload.starts_at, payload.ends_at)
        existing = await self.repository.find_exact_window(payload.starts_at, payload.ends_at)
        if existing:
            raise ConflictError("Já existe um horário cadastrado para esse intervalo.")
        return await self.repository.add(AvailabilitySlot(**payload.model_dump()))

    async def block_slot(self, payload: BlockSlotInput) -> AvailabilitySlot:
        await self.validate_business_window_async(payload.starts_at, payload.ends_at)
        existing = await self.repository.find_exact_window(payload.starts_at, payload.ends_at)
        if not existing:
            existing = await self.repository.add(
                AvailabilitySlot(
                    starts_at=payload.starts_at,
                    ends_at=payload.ends_at,
                    status=AvailabilityStatus.AVAILABLE,
                )
            )
            await self.repository.session.flush()

        blocked = await self.repository.block_available_window(
            payload.starts_at,
            payload.ends_at,
            payload.reason,
        )
        if blocked:
            return blocked

        current = await self.repository.find_exact_window(payload.starts_at, payload.ends_at)
        if current and current.status == AvailabilityStatus.BOOKED:
            raise ConflictError("Não é possível bloquear um horário já reservado.")
        if current and current.status == AvailabilityStatus.BLOCKED:
            current.reason = payload.reason
            return current
        raise ConflictError("Horário indisponível para bloqueio.")

    async def release_slot(self, slot_id: int) -> AvailabilitySlot:
        slot = await self.repository.get_for_update(slot_id)
        if not slot:
            raise NotFoundError("Horário não encontrado.")
        if slot.status == AvailabilityStatus.BOOKED:
            raise ConflictError("Não é possível liberar um horário reservado.")
        if slot.status == AvailabilityStatus.AVAILABLE:
            return slot
        slot.status = AvailabilityStatus.AVAILABLE
        slot.reason = None
        return slot

    async def release_slot_window(self, payload: ReleaseSlotInput) -> AvailabilitySlot:
        released = await self.repository.release_blocked_window(payload.starts_at, payload.ends_at)
        if released:
            return released

        slot = await self.repository.find_exact_window(payload.starts_at, payload.ends_at)
        if not slot:
            raise NotFoundError("Horário não encontrado.")
        if slot.status == AvailabilityStatus.BOOKED:
            raise ConflictError("Não é possível liberar um horário reservado.")
        return slot

    async def reserve_slot(self, slot_id: int) -> AvailabilitySlot:
        existing = await self.repository.get_for_update(slot_id)
        if not existing:
            raise NotFoundError("Horário não encontrado.")
        await self.validate_business_window_async(existing.starts_at, existing.ends_at)
        if existing.status != AvailabilityStatus.AVAILABLE:
            raise ConflictError("Horário indisponível.")
        existing.status = AvailabilityStatus.BOOKED
        existing.reason = None
        return existing

    def validate_business_window(self, starts_at: datetime, ends_at: datetime) -> None:
        self._validate_window_shape(starts_at, ends_at)
        if not is_allowed_slot_start(starts_at):
            raise ConflictError("Horário fora da disponibilidade do atelier.")

    async def validate_business_window_async(self, starts_at: datetime, ends_at: datetime) -> None:
        self._validate_window_shape(starts_at, ends_at)
        if not await self.is_allowed_slot_start(starts_at):
            raise ConflictError("Horário fora da disponibilidade do atelier.")

    async def is_allowed_slot_start(self, starts_at: datetime) -> bool:
        atelier_starts_at = to_atelier_datetime(starts_at)
        allowed_minutes = await self.schedule_policy.allowed_hours_for_date(starts_at)
        return minute_of_day(atelier_starts_at) in allowed_minutes

    def _validate_window_shape(self, starts_at: datetime, ends_at: datetime) -> None:
        if ends_at <= starts_at:
            raise ConflictError("Horário final deve ser posterior ao inicial.")

        duration = ends_at - starts_at
        if duration != timedelta(minutes=SLOT_MINUTES):
            raise ConflictError("A agenda trabalha com intervalos de 30 minutos.")

        if starts_at.minute not in {0, 30} or starts_at.second != 0 or starts_at.microsecond != 0:
            raise ConflictError("Horário deve começar em minuto 00 ou 30.")

        if starts_at.date() != ends_at.date():
            raise ConflictError("Horário não pode atravessar dias.")

    def allowed_hours_for_date(self, date_time: datetime) -> set[int]:
        return allowed_hours_for_date(date_time)
