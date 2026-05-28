from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base
from app.models.enums import AppointmentStatus, enum_values
from app.models.mixins import TimestampMixin


class StatusHistory(TimestampMixin, Base):
    __tablename__ = "status_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    request_id: Mapped[int] = mapped_column(
        ForeignKey("appointment_requests.id"), nullable=False, index=True
    )
    from_status: Mapped[AppointmentStatus | None] = mapped_column(
        Enum(AppointmentStatus, values_callable=enum_values), nullable=True
    )
    to_status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, values_callable=enum_values), nullable=False
    )
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_by: Mapped[str] = mapped_column(String(80), nullable=False, default="system")

    request = relationship("AppointmentRequest", back_populates="status_history")
