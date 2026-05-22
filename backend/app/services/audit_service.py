from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.repositories.audit_log_repository import AuditLogRepository


class AuditService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = AuditLogRepository(session)

    async def record(
        self,
        *,
        entity_type: str,
        entity_id: int,
        action: str,
        changed_by: str,
        before: dict | None,
        after: dict | None,
        request_id: int | None = None,
    ) -> AuditLog:
        return await self.repository.add(
            AuditLog(
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                changed_by=changed_by,
                before_snapshot=before,
                after_snapshot=after,
                request_id=request_id,
            )
        )

    async def list(self, request_id: int | None = None, limit: int = 100) -> list[AuditLog]:
        return await self.repository.list(request_id=request_id, limit=limit)
