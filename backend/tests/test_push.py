import asyncio
import base64
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.config.settings import Settings
from app.routes import push
from app.services.push_service import (
    PushSubscriptionInput,
    configured,
    delivery_status,
    dispatch_batch,
    send_push,
    validate_endpoint,
)
from app.utils.security import require_admin_user


@pytest.mark.parametrize("url", [
    "http://fcm.googleapis.com/x", "https://localhost/x", "https://127.0.0.1/x",
    "https://fcm.googleapis.com.evil.test/x", "https://evilpush.apple.com/x",
    "https://fcm.googleapis.com:8000/x", "https://user@fcm.googleapis.com/x",
])
def test_endpoint_ssrf_blocked(url):
    with pytest.raises(ValueError):
        validate_endpoint(url)


@pytest.mark.parametrize("host", [
    "web.push.apple.com", "fcm.googleapis.com", "updates.push.services.mozilla.com",
])
def test_supported_providers(host):
    assert validate_endpoint(f"https://{host}/test")


def test_subscription_keys_are_validated():
    with pytest.raises(ValueError):
        PushSubscriptionInput(endpoint="https://web.push.apple.com/x", auth="bad", p256dh="bad")


@pytest.mark.parametrize(("http", "attempts", "expected"), [
    (201, 1, "sent"), (410, 1, "expired"), (404, 1, "expired"),
    (500, 1, "pending"), (0, 1, "pending"), (429, 2, "pending"), (500, 6, "failed"),
])
def test_retry_classification(http, attempts, expected):
    assert delivery_status(http, attempts) == expected


async def test_disabled_worker_never_opens_database():
    factory = AsyncMock(side_effect=AssertionError("Must not access DB"))
    await dispatch_batch(factory, settings=Settings(push_enabled=False))
    factory.assert_not_called()


async def test_admin_routes_require_authentication(monkeypatch):
    from app.main import create_app

    monkeypatch.setattr(push, "get_settings", lambda: Settings(push_admin_id=1))
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for route in ("subscribe", "unsubscribe", "status"):
            assert (await client.post(f"/api/admin/push/{route}", json={})).status_code == 401
        assert (await client.get("/api/admin/push/config")).status_code == 401


async def test_other_admin_cannot_subscribe(monkeypatch):
    monkeypatch.setattr(push, "get_settings", lambda: Settings(push_admin_id=1))
    app = FastAPI()
    app.include_router(push.router)
    app.dependency_overrides[require_admin_user] = lambda: SimpleNamespace(id=2)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.get("/admin/push/config")).status_code == 403


def test_no_private_key_in_config(monkeypatch):
    settings = Settings(push_admin_id=1, push_vapid_private_key="secret")
    monkeypatch.setattr(push, "get_settings", lambda: settings)
    assert "secret" not in str(asyncio.run(push.config(SimpleNamespace(id=1))))
    assert not configured(settings)


def test_real_transport_encrypts_minimal_payload_and_disables_redirects(monkeypatch):
    """Exercise installed pywebpush + encryption, replace only HTTP transport."""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from requests import Session

    key = ec.generate_private_key(ec.SECP256R1())
    public = key.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    private = key.private_bytes(
        serialization.Encoding.DER, serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    def encode(value):
        return base64.urlsafe_b64encode(value).decode().rstrip("=")
    calls = []

    def fake_request(self, *args, **kwargs):
        calls.append(kwargs)
        return SimpleNamespace(status_code=201, text="")

    monkeypatch.setattr(Session, "request", fake_request)
    assert send_push(
        {"endpoint": "https://web.push.apple.com/test",
         "p256dh": encode(public), "auth": encode(b"x" * 16)},
        99, Settings(push_vapid_private_key=encode(private),
                     push_vapid_subject="mailto:admin@example.com"),
    ) == 201
    assert calls[0]["allow_redirects"] is False
    assert calls[0]["timeout"] == 10
    assert b"eventId" not in calls[0]["data"]  # encrypted, not plaintext
