from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.enums import PaymentMethod, PaymentProvider, PaymentStatus
from app.validators.common import ORMModel


class MockPaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0, decimal_places=2)
    pix_qr_code: str | None = Field(default=None, max_length=4000)
    pix_copy_paste: str | None = Field(default=None, max_length=4000)
    external_payment_id: str | None = Field(default=None, max_length=120)
    expires_at: datetime | None = None


class PaymentStatusUpdate(BaseModel):
    status: PaymentStatus
    paid_at: datetime | None = None


class PaymentRead(ORMModel):
    id: int
    order_id: int
    provider: PaymentProvider
    method: PaymentMethod
    status: PaymentStatus
    amount: Decimal
    pix_qr_code: str | None
    pix_copy_paste: str | None
    external_payment_id: str | None
    paid_at: datetime | None
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
