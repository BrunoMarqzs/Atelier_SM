from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository
from app.utils.errors import NotFoundError


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = NotificationRepository(session)

    async def create_internal(
        self,
        *,
        event_type: str,
        title: str,
        message: str,
        recipient_type: str = "admin",
        recipient: str | None = None,
        request_id: int | None = None,
    ) -> Notification:
        return await self.repository.add(
            Notification(
                event_type=event_type,
                channel="internal",
                recipient_type=recipient_type,
                recipient=recipient,
                title=title,
                message=message,
                request_id=request_id,
            )
        )

    async def list(self, unread_only: bool = False, limit: int = 80) -> list[Notification]:
        return await self.repository.list(unread_only=unread_only, limit=limit)

    async def mark_read(self, notification_id: int) -> Notification:
        notification = await self.repository.mark_read(notification_id)
        if not notification:
            raise NotFoundError("Notificação não encontrada.")
        return notification
