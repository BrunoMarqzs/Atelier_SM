from enum import StrEnum


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
