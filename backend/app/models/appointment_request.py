from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base
from app.models.enums import AppointmentStatus
from app.models.mixins import TimestampMixin


class AppointmentRequest(TimestampMixin, Base):
    __tablename__ = "appointment_requests"
    __table_args__ = (UniqueConstraint("public_code", name="uq_appointment_requests_public_code"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("client_profiles.id"), nullable=False, index=True
    )
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), nullable=False, index=True)
    slot_id: Mapped[int] = mapped_column(
        ForeignKey("availability_slots.id"), nullable=False, unique=True, index=True
    )
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus), nullable=False, default=AppointmentStatus.PENDING, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    public_code: Mapped[str] = mapped_column(String(16), nullable=False, index=True)

    client = relationship("ClientProfile", back_populates="requests")
    service = relationship("Service", back_populates="requests")
    slot = relationship("AvailabilitySlot", back_populates="request")
    images = relationship("RequestImage", back_populates="request", cascade="all, delete-orphan")
    status_history = relationship(
        "StatusHistory", back_populates="request", cascade="all, delete-orphan"
    )
