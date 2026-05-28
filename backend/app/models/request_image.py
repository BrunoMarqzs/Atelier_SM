from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base
from app.models.enums import StorageProvider, enum_values
from app.models.mixins import TimestampMixin


class RequestImage(TimestampMixin, Base):
    __tablename__ = "request_images"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    request_id: Mapped[int] = mapped_column(
        ForeignKey("appointment_requests.id"), nullable=False, index=True
    )
    storage_provider: Mapped[StorageProvider] = mapped_column(
        Enum(StorageProvider, values_callable=enum_values), nullable=False
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    public_id: Mapped[str | None] = mapped_column(String(240), nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(240), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(80), nullable=False)
    size_bytes: Mapped[int] = mapped_column(nullable=False)

    request = relationship("AppointmentRequest", back_populates="images")
