from datetime import datetime

from app.validators.common import ORMModel


class NotificationRead(ORMModel):
    id: int
    event_type: str
    channel: str
    recipient_type: str
    recipient: str | None
    title: str
    message: str
    request_id: int | None
    read_at: datetime | None
    created_at: datetime
