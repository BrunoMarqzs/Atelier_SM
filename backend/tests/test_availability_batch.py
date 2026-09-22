from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config.database import Base
from app.models import AvailabilitySlot, AvailabilityStatus, ScheduleException
from app.services.availability_service import AvailabilityService
from app.services.schedule_policy_service import SchedulePolicyService
from app.utils.errors import ConflictError


class SessionAdapter:
    def __init__(self, session):
        self.session = session

    async def execute(self, statement):
        return self.session.execute(statement)

    async def get(self, model, key):
        return self.session.get(model, key)

    def add(self, value):
        self.session.add(value)

    def add_all(self, values):
        self.session.add_all(values)

    async def flush(self):
        self.session.flush()


@pytest.mark.asyncio
async def test_month_uses_four_reads_preserves_existing_slots_and_policy_changes():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    statements = []
    event.listen(
        engine, "before_cursor_execute", lambda c, cur, sql, p, ctx, many: statements.append(sql)
    )
    try:
        with Session(engine) as session:
            session.add(SchedulePolicyService.default_config())
            session.commit()
            service = AvailabilityService(SessionAdapter(session))
            start, end = datetime(2026, 9, 1), datetime(2026, 9, 30, 23, 59)
            slots = await service.list_for_admin(start, end)
            assert len(slots) == 358
            booked, blocked = slots[:2]
            booked.status = AvailabilityStatus.BOOKED
            blocked.status = AvailabilityStatus.BLOCKED
            blocked.reason = "Preserve me"
            session.commit()
            statements.clear()
            slots_again = await service.list_for_admin(start, end)
            assert len(slots_again) == 358
            assert sum(sql.startswith("SELECT") for sql in statements) == 4
            assert not any(sql.startswith("INSERT") for sql in statements)
            assert booked.status == AvailabilityStatus.BOOKED
            assert blocked.status == AvailabilityStatus.BLOCKED
            assert blocked.reason == "Preserve me"
            closed_date = booked.starts_at.date()
            session.add(ScheduleException(exception_date=closed_date, kind="closed"))
            session.commit()
            public = await service.list_available(start, end)
            admin = await service.list_for_admin(start, end)
            assert not any(slot.starts_at.date() == closed_date for slot in public)
            assert [slot for slot in admin if slot.starts_at.date() == closed_date] == [booked]
    finally:
        engine.dispose()


@pytest.mark.asyncio
async def test_materialization_utc_window_uses_local_business_hours():
    service = AvailabilityService(None)
    service.repository = AsyncMock()
    service.repository.list_between.return_value = []
    await service.ensure_business_slots(
        datetime(2026, 9, 22, 11, tzinfo=UTC), datetime(2026, 9, 22, 13, tzinfo=UTC)
    )
    slots = service.repository.add_many.call_args.args[0]
    assert [slot.starts_at.astimezone(UTC).hour for slot in slots] == [11, 11, 12, 12]
    assert [slot.starts_at.hour for slot in slots] == [8, 8, 9, 9]
    assert all(slot.ends_at - slot.starts_at == timedelta(minutes=30) for slot in slots)
    service.repository.find_exact_window.assert_not_called()


@pytest.mark.asyncio
async def test_existing_utc_booking_is_not_inserted_again_and_partial_slots_are_excluded():
    service = AvailabilityService(None)
    service.repository = AsyncMock()
    start = datetime(2026, 9, 22, 11, tzinfo=UTC)
    booked = AvailabilitySlot(
        starts_at=start + timedelta(minutes=30),
        ends_at=start + timedelta(minutes=60),
        status=AvailabilityStatus.BOOKED,
    )
    service.repository.list_between.return_value = [booked]
    await service.ensure_business_slots(
        start + timedelta(minutes=15), start + timedelta(minutes=105)
    )
    slots = service.repository.add_many.call_args.args[0]
    assert len(slots) == 1
    assert slots[0].starts_at == start + timedelta(minutes=60)
    assert booked.status == AvailabilityStatus.BOOKED


@pytest.mark.asyncio
async def test_concurrent_duplicate_still_reports_conflict_without_overwriting():
    service = AvailabilityService(None)
    service.repository = AsyncMock()
    service.repository.list_between.return_value = []
    service.repository.add_many.side_effect = IntegrityError("insert", {}, Exception("duplicate"))
    with pytest.raises(ConflictError, match="outra transação"):
        await service.ensure_business_slots(datetime(2026, 9, 22, 8), datetime(2026, 9, 22, 9))


@pytest.mark.asyncio
async def test_batch_policy_matches_daily_policy_for_custom_and_closed_dates():
    policy = SchedulePolicyService(None)
    policy.config_repository = AsyncMock()
    policy.config_repository.get_singleton.return_value = SchedulePolicyService.default_config()
    policy.exception_repository = AsyncMock()
    exceptions = [
        ScheduleException(exception_date=datetime(2026, 9, 22).date(), kind="closed"),
        ScheduleException(
            exception_date=datetime(2026, 9, 23).date(), kind="custom", hours=[9, 10]
        ),
    ]
    policy.exception_repository.list_between.return_value = exceptions
    batch = await policy.allowed_hours_for_window(datetime(2026, 9, 21), datetime(2026, 9, 27))
    for day, hours in batch.items():
        policy.exception_repository.get_by_date.return_value = next(
            (item for item in exceptions if item.exception_date == day), None
        )
        assert hours == await policy.allowed_hours_for_date(
            datetime.combine(day, datetime.min.time())
        )
