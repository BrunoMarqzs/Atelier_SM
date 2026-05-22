import pytest
from pydantic import ValidationError

from app.validators.client import ClientIdentityInput, normalize_phone


def test_normalizes_phone_to_digits() -> None:
    assert normalize_phone("(11) 99999-8888") == "11999998888"


def test_rejects_invalid_phone() -> None:
    with pytest.raises(ValidationError):
        ClientIdentityInput(name="Sibele", phone="123")
