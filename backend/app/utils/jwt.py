import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from typing import Any

from app.config.settings import get_settings
from app.utils.errors import UnauthorizedError


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _base64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(*, subject: str, admin_id: int) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "admin_id": admin_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.access_token_expire_minutes)).timestamp()),
        "typ": "access",
    }
    return encode_jwt(payload)


def encode_jwt(payload: dict[str, Any]) -> str:
    settings = get_settings()
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = ".".join(
        [
            _base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8")),
            _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
        ]
    )
    signature = hmac.new(
        settings.jwt_secret_key.encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{signing_input}.{_base64url_encode(signature)}"


def decode_jwt(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        header_segment, payload_segment, signature_segment = token.split(".", maxsplit=2)
    except ValueError as exc:
        raise UnauthorizedError("Token inválido.") from exc

    signing_input = f"{header_segment}.{payload_segment}"
    expected_signature = hmac.new(
        settings.jwt_secret_key.encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()
    received_signature = _base64url_decode(signature_segment)
    if not hmac.compare_digest(expected_signature, received_signature):
        raise UnauthorizedError("Token inválido.")

    payload = json.loads(_base64url_decode(payload_segment))
    expires_at = payload.get("exp")
    if not isinstance(expires_at, int) or expires_at < int(datetime.now(UTC).timestamp()):
        raise UnauthorizedError("Sessão expirada.")
    if payload.get("typ") != "access":
        raise UnauthorizedError("Tipo de token inválido.")
    return payload
