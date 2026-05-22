from sqlalchemy import select

from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    model = AuditLog

    async def list(self, request_id: int | None = None, limit: int = 100) -> list[AuditLog]:
        statement = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        if request_id is not None:
            statement = statement.where(AuditLog.request_id == request_id)
        result = await self.session.execute(statement)
        return list(result.scalars().all())
