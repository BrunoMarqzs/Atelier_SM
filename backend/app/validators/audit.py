from datetime import datetime

from app.validators.common import ORMModel


class AuditLogRead(ORMModel):
    id: int
    entity_type: str
    entity_id: int
    action: str
    changed_by: str
    request_id: int | None
    before_snapshot: dict | None
    after_snapshot: dict | None
    created_at: datetime
