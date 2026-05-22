from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.enums import PriceType
from app.validators.service import ServiceCreate


def test_fixed_price_service_requires_price() -> None:
    with pytest.raises(ValidationError):
        ServiceCreate(
            name="Ajuste fino",
            description="Ajuste refinado de vestido social.",
            category="Ajustes",
            duration_minutes=60,
            price_type=PriceType.FIXED,
        )


def test_quote_service_rejects_fixed_price() -> None:
    with pytest.raises(ValidationError):
        ServiceCreate(
            name="Vestido sob medida",
            description="Criação sob medida com avaliação personalizada.",
            category="Sob medida",
            duration_minutes=180,
            price_type=PriceType.QUOTE,
            fixed_price=Decimal("300.00"),
        )


def test_accepts_valid_quote_service() -> None:
    service = ServiceCreate(
        name="Vestido sob medida",
        description="Criação sob medida com avaliação personalizada.",
        category="Sob medida",
        duration_minutes=180,
        price_type=PriceType.QUOTE,
    )

    assert service.fixed_price is None
