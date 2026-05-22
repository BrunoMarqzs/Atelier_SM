from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule_config import ScheduleConfig
from app.models.schedule_exception import ScheduleException
from app.repositories.schedule_repository import (
    ScheduleConfigRepository,
    ScheduleExceptionRepository,
)
from app.utils.errors import NotFoundError
from app.utils.schedule_rules import allowed_hours_for_date as default_allowed_hours_for_date
from app.utils.schedule_rules import to_atelier_datetime
from app.validators.schedule import (
    DEFAULT_LUNCH_BLOCK_HOURS,
    DEFAULT_WEEKLY_HOURS,
    ScheduleConfigUpdate,
    ScheduleExceptionCreate,
)


class SchedulePolicyService:
    def __init__(self, session: AsyncSession | None) -> None:
        self.session = session
        self.config_repository = ScheduleConfigRepository(session) if session else None
        self.exception_repository = ScheduleExceptionRepository(session) if session else None

    async def get_config(self) -> ScheduleConfig:
        if not self.config_repository:
            return self.default_config()
        config = await self.config_repository.get_singleton()
        if config and hasattr(config, "weekly_hours"):
            return config
        config = self.default_config()
        if not hasattr(self.config_repository.session, "add"):
            return config
        return await self.config_repository.add(config)

    async def update_config(self, payload: ScheduleConfigUpdate) -> ScheduleConfig:
        if not self.config_repository:
            raise NotFoundError("Configuração de agenda indisponível.")
        config = await self.get_config()
        if payload.opening_time is not None:
            config.opening_time = payload.opening_time
        if payload.closing_time is not None:
            config.closing_time = payload.closing_time
        if payload.lunch_block_hours is not None:
            config.lunch_block_hours = payload.lunch_block_hours
        if payload.weekly_hours is not None:
            merged = dict(config.weekly_hours or DEFAULT_WEEKLY_HOURS)
            merged.update(payload.weekly_hours)
            config.weekly_hours = merged
        await self.config_repository.session.flush()
        return config

    async def list_exceptions(self) -> list[ScheduleException]:
        if not self.exception_repository:
            return []
        return await self.exception_repository.list()

    async def upsert_exception(self, payload: ScheduleExceptionCreate) -> ScheduleException:
        if not self.exception_repository:
            raise NotFoundError("Exceções de agenda indisponíveis.")
        existing = await self.exception_repository.get_by_date(payload.exception_date)
        if existing:
            existing.kind = payload.kind
            existing.hours = payload.hours
            existing.reason = payload.reason
            await self.exception_repository.session.flush()
            return existing
        return await self.exception_repository.add(ScheduleException(**payload.model_dump()))

    async def delete_exception(self, exception_id: int) -> None:
        if not self.exception_repository:
            raise NotFoundError("Exceções de agenda indisponíveis.")
        exception = await self.exception_repository.get(exception_id)
        if not exception:
            raise NotFoundError("Exceção de agenda não encontrada.")
        await self.exception_repository.delete(exception)

    async def allowed_hours_for_date(self, date_time: datetime) -> set[int]:
        if not self.config_repository or not self.exception_repository:
            return default_allowed_hours_for_date(date_time)

        atelier_date_time = to_atelier_datetime(date_time)
        exception = await self.exception_repository.get_by_date(atelier_date_time.date())
        if exception and hasattr(exception, "kind"):
            if exception.kind == "closed":
                return set()
            return set(exception.hours or [])

        config = await self.get_config()
        hours = set((config.weekly_hours or DEFAULT_WEEKLY_HOURS).get(str(atelier_date_time.weekday()), []))
        blocked_hours = set(config.lunch_block_hours or DEFAULT_LUNCH_BLOCK_HOURS)
        return hours - blocked_hours

    @staticmethod
    def default_config() -> ScheduleConfig:
        return ScheduleConfig(
            id=1,
            opening_time="08:00",
            closing_time="19:00",
            lunch_block_hours=list(DEFAULT_LUNCH_BLOCK_HOURS),
            weekly_hours=dict(DEFAULT_WEEKLY_HOURS),
        )
