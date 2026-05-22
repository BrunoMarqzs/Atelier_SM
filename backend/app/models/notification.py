from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.config.database import Base
from app.models.mixins import TimestampMixin


class Notification(TimestampMixin, Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(40), nullable=False, default="internal", index=True)
    recipient_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    recipient: Mapped[str | None] = mapped_column(String(180), nullable=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    request_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointment_requests.id"), nullable=True, index=True
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
