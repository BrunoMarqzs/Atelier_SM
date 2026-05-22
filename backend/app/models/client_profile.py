from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base
from app.models.mixins import TimestampMixin


class ClientProfile(TimestampMixin, Base):
    __tablename__ = "client_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    normalized_phone: Mapped[str] = mapped_column(String(32), nullable=False, index=True)

    requests = relationship("AppointmentRequest", back_populates="client")
