from datetime import date

from sqlalchemy import JSON, Date, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.config.database import Base
from app.models.mixins import TimestampMixin


class ScheduleException(TimestampMixin, Base):
    __tablename__ = "schedule_exceptions"
    __table_args__ = (UniqueConstraint("exception_date", name="uq_schedule_exception_date"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    exception_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(40), nullable=False, default="closed")
    hours: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)
    reason: Mapped[str | None] = mapped_column(String(240), nullable=True)
