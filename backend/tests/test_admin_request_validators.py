from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.validators.request import AppointmentEstimateInput, AppointmentRescheduleInput


def test_estimate_input_accepts_valid_price() -> None:
    payload = AppointmentEstimateInput(
        estimated_price=Decimal("250.00"),
        comment="Orçamento aprovado.",
    )

    assert payload.estimated_price == Decimal("250.00")


def test_estimate_input_rejects_negative_price() -> None:
    with pytest.raises(ValidationError):
        AppointmentEstimateInput(estimated_price=Decimal("-1.00"))


def test_reschedule_input_requires_positive_slot() -> None:
    with pytest.raises(ValidationError):
        AppointmentRescheduleInput(slot_id=0)
