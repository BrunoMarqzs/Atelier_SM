from datetime import UTC, datetime, timedelta

import pytest

from app.utils.errors import UnauthorizedError
from app.utils.jwt import create_access_token, decode_jwt, encode_jwt


def test_access_token_roundtrip() -> None:
    token = create_access_token(subject="admin@ateliersibele.local", admin_id=1)

    payload = decode_jwt(token)

    assert payload["sub"] == "admin@ateliersibele.local"
    assert payload["admin_id"] == 1
    assert payload["typ"] == "access"


def test_expired_token_is_rejected() -> None:
    token = encode_jwt(
        {
            "sub": "admin@ateliersibele.local",
            "admin_id": 1,
            "typ": "access",
            "exp": int((datetime.now(UTC) - timedelta(minutes=1)).timestamp()),
        }
    )

    with pytest.raises(UnauthorizedError):
        decode_jwt(token)
