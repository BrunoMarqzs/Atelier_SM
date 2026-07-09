from datetime import datetime

from sqlalchemy import select

from app.models.announcement import Announcement
from app.repositories.base import BaseRepository


class AnnouncementRepository(BaseRepository[Announcement]):
    model = Announcement

    async def get(self, announcement_id: int) -> Announcement | None:
        return await self.session.get(Announcement, announcement_id)

    async def list_active_public(self, now: datetime | None = None) -> list[Announcement]:
        current_time = now or datetime.now()
        result = await self.session.execute(
            select(Announcement)
            .where(
                Announcement.is_active.is_(True),
                (Announcement.starts_at.is_(None)) | (Announcement.starts_at <= current_time),
                (Announcement.ends_at.is_(None)) | (Announcement.ends_at >= current_time),
            )
            .order_by(Announcement.priority.desc(), Announcement.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_all(self) -> list[Announcement]:
        result = await self.session.execute(
            select(Announcement).order_by(
                Announcement.is_active.desc(),
                Announcement.priority.desc(),
                Announcement.created_at.desc(),
            )
        )
        return list(result.scalars().all())
