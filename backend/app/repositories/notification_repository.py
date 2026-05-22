from datetime import datetime

from sqlalchemy import select

from app.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    model = Notification

    async def list(self, unread_only: bool = False, limit: int = 80) -> list[Notification]:
        statement = select(Notification).order_by(Notification.created_at.desc()).limit(limit)
        if unread_only:
            statement = statement.where(Notification.read_at.is_(None))
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def mark_read(self, notification_id: int) -> Notification | None:
        notification = await self.session.get(Notification, notification_id)
        if notification and notification.read_at is None:
            notification.read_at = datetime.utcnow()
        return notification
