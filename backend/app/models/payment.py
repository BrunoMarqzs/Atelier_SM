from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base
from app.models.enums import PaymentMethod, PaymentProvider, PaymentStatus, enum_values
from app.models.mixins import TimestampMixin


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"
    __table_args__ = (UniqueConstraint("order_id", name="uq_payments_order_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("appointment_requests.id"), nullable=False, index=True
    )
    provider: Mapped[PaymentProvider] = mapped_column(
        Enum(PaymentProvider, values_callable=enum_values),
        nullable=False,
        default=PaymentProvider.MOCK,
    )
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, values_callable=enum_values),
        nullable=False,
        default=PaymentMethod.PIX,
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, values_callable=enum_values),
        nullable=False,
        default=PaymentStatus.PENDING,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    pix_qr_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    pix_copy_paste: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_payment_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    order = relationship("AppointmentRequest", back_populates="payments")
