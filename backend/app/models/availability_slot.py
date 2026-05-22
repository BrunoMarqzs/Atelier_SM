from datetime import datetime

from sqlalchemy import DateTime, Enum, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base
from app.models.enums import AvailabilityStatus
from app.models.mixins import TimestampMixin


class AvailabilitySlot(TimestampMixin, Base):
    __tablename__ = "availability_slots"
    __table_args__ = (UniqueConstraint("starts_at", "ends_at", name="uq_availability_slot_window"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    status: Mapped[AvailabilityStatus] = mapped_column(
        Enum(AvailabilityStatus), nullable=False, default=AvailabilityStatus.AVAILABLE
    )
    reason: Mapped[str | None] = mapped_column(String(240), nullable=True)

    request = relationship("AppointmentRequest", back_populates="slot", uselist=False)
