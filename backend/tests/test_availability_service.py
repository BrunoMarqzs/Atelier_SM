from datetime import UTC, datetime, timedelta

import pytest

from app.models.enums import AvailabilityStatus
from app.services.availability_service import AvailabilityService
from app.utils.errors import ConflictError
from app.validators.availability import BlockSlotInput, ReleaseSlotInput


def test_validate_business_window_rejects_off_grid_minutes() -> None:
    service = AvailabilityService(session=None)  # type: ignore[arg-type]

    with pytest.raises(ConflictError, match="minuto 00 ou 30"):
        service.validate_business_window(
            datetime(2026, 6, 2, 9, 15),
            datetime(2026, 6, 2, 9, 45),
        )


def test_validate_business_window_allows_half_hour_slots() -> None:
    service = AvailabilityService(session=None)  # type: ignore[arg-type]

    service.validate_business_window(
        datetime(2026, 6, 2, 9, 30),
        datetime(2026, 6, 2, 10, 0),
    )


def test_validate_business_window_rejects_outside_business_hours() -> None:
    service = AvailabilityService(session=None)  # type: ignore[arg-type]

    with pytest.raises(ConflictError, match="disponibilidade"):
        service.validate_business_window(
            datetime(2026, 6, 1, 18, 0),
            datetime(2026, 6, 1, 18, 30),
        )


def test_validate_business_window_allows_extended_hours_only_on_tuesday_thursday_friday() -> None:
    service = AvailabilityService(session=None)  # type: ignore[arg-type]

    service.validate_business_window(
        datetime(2026, 6, 2, 8, 0),
        datetime(2026, 6, 2, 8, 30),
    )
    service.validate_business_window(
        datetime(2026, 6, 2, 19, 0),
        datetime(2026, 6, 2, 19, 30),
    )
    service.validate_business_window(
        datetime(2026, 6, 4, 18, 0),
        datetime(2026, 6, 4, 18, 30),
    )
    service.validate_business_window(
        datetime(2026, 6, 5, 18, 0),
        datetime(2026, 6, 5, 18, 30),
    )


def test_validate_business_window_rejects_sunday_and_lunch_hours() -> None:
    service = AvailabilityService(session=None)  # type: ignore[arg-type]

    with pytest.raises(ConflictError, match="disponibilidade"):
        service.validate_business_window(
            datetime(2026, 6, 7, 14, 0),
            datetime(2026, 6, 7, 14, 30),
        )

    with pytest.raises(ConflictError, match="disponibilidade"):
        service.validate_business_window(
            datetime(2026, 6, 2, 11, 30),
            datetime(2026, 6, 2, 12, 0),
        )


def test_allowed_hours_match_atelier_schedule() -> None:
    service = AvailabilityService(session=None)  # type: ignore[arg-type]

    assert service.allowed_hours_for_date(datetime(2026, 6, 1)) == {
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
    }
    assert service.allowed_hours_for_date(datetime(2026, 6, 2)) == {
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
    }
    assert service.allowed_hours_for_date(datetime(2026, 6, 4)) == {
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
    }
    assert service.allowed_hours_for_date(datetime(2026, 6, 5)) == {
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
    }
    assert service.allowed_hours_for_date(datetime(2026, 6, 6)) == {840, 870, 900, 930, 960}
    assert service.allowed_hours_for_date(datetime(2026, 6, 7)) == set()


def test_allowed_slot_uses_atelier_timezone_for_persisted_utc_slots() -> None:
    service = AvailabilityService(session=None)  # type: ignore[arg-type]

    service.validate_business_window(
        datetime(2026, 6, 2, 11, 0, tzinfo=UTC),
        datetime(2026, 6, 2, 11, 30, tzinfo=UTC),
    )
    service.validate_business_window(
        datetime(2026, 6, 2, 11, 30, tzinfo=UTC),
        datetime(2026, 6, 2, 12, 0, tzinfo=UTC),
    )

    with pytest.raises(ConflictError, match="disponibilidade"):
        service.validate_business_window(
            datetime(2026, 6, 2, 14, 0, tzinfo=UTC),
            datetime(2026, 6, 2, 14, 30, tzinfo=UTC),
        )

    service.validate_business_window(
        datetime(2026, 6, 2, 17, 0, tzinfo=UTC),
        datetime(2026, 6, 2, 17, 30, tzinfo=UTC),
    )


@pytest.mark.anyio
async def test_async_allowed_slot_uses_atelier_timezone_for_persisted_utc_slots() -> None:
    service = AvailabilityService(session=None)  # type: ignore[arg-type]

    assert await service.is_allowed_slot_start(datetime(2026, 5, 26, 11, 0, tzinfo=UTC))
    assert await service.is_allowed_slot_start(datetime(2026, 5, 26, 11, 30, tzinfo=UTC))
    assert await service.is_allowed_slot_start(datetime(2026, 5, 26, 12, 0, tzinfo=UTC))
    assert await service.is_allowed_slot_start(datetime(2026, 5, 26, 12, 30, tzinfo=UTC))
    assert await service.is_allowed_slot_start(datetime(2026, 5, 26, 13, 0, tzinfo=UTC))
    assert not await service.is_allowed_slot_start(datetime(2026, 5, 26, 14, 0, tzinfo=UTC))
    assert not await service.is_allowed_slot_start(datetime(2026, 5, 26, 14, 30, tzinfo=UTC))
    assert not await service.is_allowed_slot_start(datetime(2026, 5, 26, 15, 0, tzinfo=UTC))
    assert not await service.is_allowed_slot_start(datetime(2026, 5, 26, 16, 0, tzinfo=UTC))
    assert await service.is_allowed_slot_start(datetime(2026, 5, 26, 21, 0, tzinfo=UTC))
    assert await service.is_allowed_slot_start(datetime(2026, 5, 26, 21, 30, tzinfo=UTC))
    assert await service.is_allowed_slot_start(datetime(2026, 5, 26, 22, 0, tzinfo=UTC))


@pytest.mark.anyio
async def test_block_slot_rejects_booked_slot(fake_session, availability_slot_factory) -> None:
    slot = availability_slot_factory(status=AvailabilityStatus.BOOKED)
    fake_session.add_existing(slot)
    service = AvailabilityService(fake_session)

    with pytest.raises(ConflictError, match="já reservado"):
        await service.block_slot(
            BlockSlotInput(
                starts_at=slot.starts_at,
                ends_at=slot.ends_at,
                reason="Manutenção",
            )
        )


@pytest.mark.anyio
async def test_release_window_rejects_booked_slot(fake_session, availability_slot_factory) -> None:
    slot = availability_slot_factory(status=AvailabilityStatus.BOOKED)
    fake_session.add_existing(slot)
    service = AvailabilityService(fake_session)

    with pytest.raises(ConflictError, match="reservado"):
        await service.release_slot_window(
            ReleaseSlotInput(
                starts_at=slot.starts_at,
                ends_at=slot.ends_at,
            )
        )


@pytest.mark.anyio
async def test_reserve_slot_rejects_blocked_slot(availability_slot_factory) -> None:
    slot = availability_slot_factory(status=AvailabilityStatus.BLOCKED)
    service = AvailabilityService(session=None)  # type: ignore[arg-type]

    class FakeRepository:
        async def get_for_update(self, _slot_id):
            return slot

    service.repository = FakeRepository()

    with pytest.raises(ConflictError, match="indisponível"):
        await service.reserve_slot(slot.id)


@pytest.mark.anyio
async def test_reserve_slot_rejects_legacy_invalid_lunch_slot(availability_slot_factory) -> None:
    slot = availability_slot_factory(status=AvailabilityStatus.AVAILABLE)
    slot.starts_at = datetime(2026, 6, 2, 12, 0)
    slot.ends_at = datetime(2026, 6, 2, 12, 30)
    service = AvailabilityService(session=None)  # type: ignore[arg-type]

    class FakeRepository:
        async def get_for_update(self, _slot_id):
            return slot

    service.repository = FakeRepository()

    with pytest.raises(ConflictError, match="disponibilidade"):
        await service.reserve_slot(slot.id)


@pytest.mark.anyio
async def test_ensure_business_slots_materializes_missing_hours() -> None:
    created_slots = []

    class FakeSession:
        async def flush(self):
            return None

    class FakeRepository:
        session = FakeSession()

        async def find_exact_window(self, starts_at, _ends_at):
            if starts_at.hour == 9:
                return object()
            return None

        async def add(self, slot):
            created_slots.append(slot)
            return slot

    service = AvailabilityService(session=None)  # type: ignore[arg-type]
    service.repository = FakeRepository()

    await service.ensure_business_slots(
        datetime(2026, 6, 2, 9, 0),
        datetime(2026, 6, 2, 20, 0),
    )

    assert len(created_slots) == 13
    assert {slot.starts_at.hour * 60 + slot.starts_at.minute for slot in created_slots} == {
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
    }
    assert all(slot.status == AvailabilityStatus.AVAILABLE for slot in created_slots)


@pytest.mark.anyio
async def test_list_available_materializes_missing_half_hour_slots() -> None:
    created_slots = []

    class FakeSession:
        async def flush(self):
            return None

    class FakeRepository:
        session = FakeSession()

        async def find_exact_window(self, _starts_at, _ends_at):
            return None

        async def add(self, slot):
            created_slots.append(slot)
            return slot

        async def list_between(self, _starts_at, _ends_at):
            return created_slots

    service = AvailabilityService(session=None)  # type: ignore[arg-type]
    service.repository = FakeRepository()

    slots = await service.list_available(
        datetime(2026, 6, 2, 8, 0),
        datetime(2026, 6, 2, 10, 0),
    )

    assert [slot.starts_at.strftime("%H:%M") for slot in slots] == [
        "08:00",
        "08:30",
        "09:00",
        "09:30",
    ]
    assert all(slot.ends_at - slot.starts_at == timedelta(minutes=30) for slot in slots)


@pytest.mark.anyio
async def test_closed_day_hides_preexisting_slots_from_public_but_keeps_bookings_for_admin(
    availability_slot_factory,
) -> None:
    available = availability_slot_factory(status=AvailabilityStatus.AVAILABLE)
    booked = availability_slot_factory(status=AvailabilityStatus.BOOKED)
    booked.id = 2
    booked.starts_at += timedelta(minutes=30)
    booked.ends_at += timedelta(minutes=30)

    class FakeRepository:
        async def list_between(self, _starts_at, _ends_at):
            return [available, booked]

    class ClosedDayPolicy:
        async def allowed_hours_for_date(self, _date_time):
            return set()

    service = AvailabilityService(session=None)  # type: ignore[arg-type]
    service.repository = FakeRepository()
    service.schedule_policy = ClosedDayPolicy()

    async def skip_materialization(_starts_at, _ends_at):
        return None

    service.ensure_business_slots = skip_materialization
    starts_at = datetime(2026, 6, 2, 0, 0)
    ends_at = datetime(2026, 6, 2, 23, 59)

    assert await service.list_available(starts_at, ends_at) == []
    assert await service.list_for_admin(starts_at, ends_at) == [booked]


@pytest.mark.anyio
async def test_closed_day_rejects_reservation_of_preexisting_available_slot(
    availability_slot_factory,
) -> None:
    slot = availability_slot_factory(status=AvailabilityStatus.AVAILABLE)

    class FakeRepository:
        async def get_for_update(self, _slot_id):
            return slot

    class ClosedDayPolicy:
        async def allowed_hours_for_date(self, _date_time):
            return set()

    service = AvailabilityService(session=None)  # type: ignore[arg-type]
    service.repository = FakeRepository()
    service.schedule_policy = ClosedDayPolicy()

    with pytest.raises(ConflictError, match="disponibilidade"):
        await service.reserve_slot(slot.id)


@pytest.fixture
def availability_slot_factory():
    from app.models.availability_slot import AvailabilitySlot

    def factory(status: AvailabilityStatus = AvailabilityStatus.AVAILABLE) -> AvailabilitySlot:
        starts_at = datetime(2026, 6, 2, 10, 0)
        return AvailabilitySlot(
            id=1,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(minutes=30),
            status=status,
        )

    return factory


@pytest.fixture
def fake_session():
    class FakeAvailabilityRepositorySession:
        def __init__(self) -> None:
            self.slot = None

        def add_existing(self, slot) -> None:
            self.slot = slot

        async def get(self, _model, slot_id):
            if self.slot and self.slot.id == slot_id:
                return self.slot
            return None

        async def execute(self, statement):
            class Result:
                def __init__(self, slot) -> None:
                    self.slot = slot

                def scalar_one_or_none(self):
                    return self.slot

                def scalars(self):
                    return self

                def all(self):
                    return [self.slot] if self.slot else []

            statement_text = str(statement)
            if "UPDATE availability_slots" in statement_text and self.slot:
                if (
                    "status=:status_1" in statement_text
                    and self.slot.status == AvailabilityStatus.AVAILABLE
                ):
                    self.slot.status = AvailabilityStatus.BLOCKED
                    return Result(self.slot)
                if (
                    "status=:status_1" in statement_text
                    and self.slot.status == AvailabilityStatus.BLOCKED
                ):
                    self.slot.status = AvailabilityStatus.AVAILABLE
                    return Result(self.slot)
                return Result(None)

            return Result(self.slot)

        async def flush(self):
            return None

    return FakeAvailabilityRepositorySession()
