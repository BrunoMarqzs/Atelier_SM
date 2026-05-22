from datetime import date

from sqlalchemy import select

from app.models.schedule_config import ScheduleConfig
from app.models.schedule_exception import ScheduleException
from app.repositories.base import BaseRepository


class ScheduleConfigRepository(BaseRepository[ScheduleConfig]):
    model = ScheduleConfig

    async def get_singleton(self) -> ScheduleConfig | None:
        return await self.session.get(ScheduleConfig, 1)


class ScheduleExceptionRepository(BaseRepository[ScheduleException]):
    model = ScheduleException

    async def get_by_date(self, exception_date: date) -> ScheduleException | None:
        result = await self.session.execute(
            select(ScheduleException).where(ScheduleException.exception_date == exception_date)
        )
        return result.scalar_one_or_none()

    async def list(self) -> list[ScheduleException]:
        result = await self.session.execute(
            select(ScheduleException).order_by(ScheduleException.exception_date.asc())
        )
        return list(result.scalars().all())

    async def get(self, exception_id: int) -> ScheduleException | None:
        return await self.session.get(ScheduleException, exception_id)

