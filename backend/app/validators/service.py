from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models.enums import PriceType
from app.validators.common import ORMModel


class ServiceBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=10, max_length=1200)
    category: str = Field(min_length=2, max_length=80)
    duration_minutes: int = Field(ge=15, le=480)
    price_type: PriceType
    fixed_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    is_active: bool = True
    highlighted: bool = False

    @model_validator(mode="after")
    def validate_price(self) -> "ServiceBase":
        if self.price_type == PriceType.FIXED and self.fixed_price is None:
            raise ValueError("Serviços com preço fixo exigem fixed_price.")
        if self.price_type == PriceType.QUOTE and self.fixed_price is not None:
            raise ValueError("Serviços sob avaliação não devem ter fixed_price.")
        return self


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, min_length=10, max_length=1200)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    duration_minutes: int | None = Field(default=None, ge=15, le=480)
    price_type: PriceType | None = None
    fixed_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    is_active: bool | None = None
    highlighted: bool | None = None


class ServiceRead(ORMModel):
    id: int
    name: str
    description: str
    category: str
    duration_minutes: int
    price_type: PriceType
    fixed_price: Decimal | None
    is_active: bool
    highlighted: bool
