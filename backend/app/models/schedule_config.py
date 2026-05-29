from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.config.database import Base
from app.models.mixins import TimestampMixin


class ScheduleConfig(TimestampMixin, Base):
    __tablename__ = "schedule_configs"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    opening_time: Mapped[str] = mapped_column(String(5), nullable=False, default="08:00")
    closing_time: Mapped[str] = mapped_column(String(5), nullable=False, default="19:00")
    lunch_block_hours: Mapped[list[int]] = mapped_column(JSON, nullable=False, default=list)
    weekly_hours: Mapped[dict[str, list[int]]] = mapped_column(JSON, nullable=False, default=dict)
