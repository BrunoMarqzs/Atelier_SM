from sqlalchemy import select

from app.models.status_history import StatusHistory
from app.repositories.base import BaseRepository


class StatusHistoryRepository(BaseRepository[StatusHistory]):
    model = StatusHistory

    async def list_by_request(self, request_id: int) -> list[StatusHistory]:
        result = await self.session.execute(
            select(StatusHistory)
            .where(StatusHistory.request_id == request_id)
            .order_by(StatusHistory.created_at.asc())
        )
        return list(result.scalars().all())
