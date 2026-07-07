from enum import StrEnum


def enum_values(enum_class: type[StrEnum]) -> list[str]:
    return [item.value for item in enum_class]


class PriceType(StrEnum):
    FIXED = "fixed"
    QUOTE = "quote"


class AvailabilityStatus(StrEnum):
    AVAILABLE = "available"
    BLOCKED = "blocked"
    BOOKED = "booked"


class AppointmentStatus(StrEnum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    QUOTE_SENT = "quote_sent"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class StorageProvider(StrEnum):
    LOCAL = "local"
    CLOUDINARY = "cloudinary"


class PaymentProvider(StrEnum):
    MOCK = "mock"


class PaymentMethod(StrEnum):
    PIX = "pix"


class PaymentStatus(StrEnum):
    PENDING = "pending"
    WAITING_PAYMENT = "waiting_payment"
    PAID = "paid"
    EXPIRED = "expired"
    REFUNDED = "refunded"
    FAILED = "failed"
