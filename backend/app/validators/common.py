from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MoneyField(BaseModel):
    amount: Decimal = Field(ge=0, decimal_places=2)


class MessageResponse(BaseModel):
    message: str


class DateRangeQuery(BaseModel):
    starts_at: datetime
    ends_at: datetime
