"""Web Push is a consumer of committed internal events, never a booking dependency."""
import asyncio
import base64
import json
import logging
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text

from app.config.database import AsyncSessionLocal
from app.config.settings import get_settings

logger = logging.getLogger(__name__)


def validate_endpoint(value: str) -> str:
    url = urlsplit(value)
    host = url.hostname or ""
    allowed = (
        host == "fcm.googleapis.com"
        or host == "updates.push.services.mozilla.com"
        or host.endswith(".push.apple.com")
    )
    if (
        url.scheme != "https" or not allowed or url.port not in (None, 443)
        or url.username or url.password or url.fragment
    ):
        raise ValueError("Provedor de notificações não autorizado.")
    return value


class PushSubscriptionInput(BaseModel):
    endpoint: str = Field(max_length=2048)
    p256dh: str = Field(max_length=120)
    auth: str = Field(max_length=32)

    _endpoint = field_validator("endpoint")(validate_endpoint)

    @field_validator("p256dh", "auth")
    @classmethod
    def valid_key(cls, value, info):
        try:
            raw = base64.b64decode(value + "=" * (-len(value) % 4), altchars=b"-_", validate=True)
            if len(raw) != (65 if info.field_name == "p256dh" else 16):
                raise ValueError()
            if info.field_name == "p256dh":
                from cryptography.hazmat.primitives.asymmetric.ec import (
                    SECP256R1,
                    EllipticCurvePublicKey,
                )
                EllipticCurvePublicKey.from_encoded_point(SECP256R1(), raw)
        except (ValueError, TypeError) as exc:
            raise ValueError("Chave de notificação inválida.") from exc
        return value


def configured(settings=None):
    settings = settings or get_settings()
    return bool(
        settings.push_enabled and settings.push_admin_id
        and settings.push_vapid_public_key and settings.push_vapid_private_key
        and settings.push_vapid_subject.startswith("mailto:")
    )


def send_push(subscription, event_id, settings):
    # Lazy import: disabled push does not require loading the transport.
    from pywebpush import WebPushException, webpush
    from requests import Session

    class NoRedirectSession(Session):
        def request(self, *args, **kwargs):
            kwargs["allow_redirects"] = False
            return super().request(*args, **kwargs)

    validate_endpoint(subscription["endpoint"])
    try:
        with NoRedirectSession() as transport:
            response = webpush(
                subscription_info={
                    "endpoint": subscription["endpoint"],
                    "keys": {"p256dh": subscription["p256dh"], "auth": subscription["auth"]},
                },
                data=json.dumps({"eventId": event_id}),
                vapid_private_key=settings.push_vapid_private_key,
                vapid_claims={"sub": settings.push_vapid_subject},
                ttl=86400,
                timeout=10,
                requests_session=transport,
            )
            return response.status_code
    except WebPushException as exc:
        return exc.response.status_code if exc.response is not None else 0


def delivery_status(http_status: int, attempts: int) -> str:
    if 200 <= http_status < 300:
        return "sent"
    if http_status in (404, 410):
        return "expired"
    return "failed" if attempts >= 6 else "pending"


async def dispatch_batch(session_factory=AsyncSessionLocal, sender=send_push, settings=None):
    settings = settings or get_settings()
    if not configured(settings):
        return
    for _ in range(20):
        async with session_factory() as session:
            # Commit each delivery independently; lock only its device, never booking rows.
            async with session.begin():
                item = (await session.execute(text("""
                    SELECT s.*, n.id AS event_id, COALESCE(d.attempts, 0) AS attempts
                    FROM push_subscriptions s
                    JOIN admin_users a ON a.id = s.admin_id AND a.is_active
                    JOIN notifications n ON n.id > s.after_event_id
                    LEFT JOIN push_deliveries d ON d.event_id=n.id AND d.subscription_id=s.id
                    WHERE s.enabled AND s.admin_id=:admin
                      AND n.event_type='request_created' AND n.channel='internal'
                      AND n.recipient_type='admin'
                      AND n.created_at > now() - interval '24 hours'
                      AND (d.event_id IS NULL OR
                           (d.status='pending' AND d.next_attempt_at <= now()))
                    ORDER BY n.id, s.id LIMIT 1 FOR UPDATE OF s SKIP LOCKED
                """), {"admin": settings.push_admin_id})).mappings().first()
                if not item:
                    return
                # Recheck after acquiring the lock: a concurrent transaction may have
                # committed a delivery since the SELECT's initial snapshot.
                previous = (await session.execute(text("""
                    SELECT status, attempts, next_attempt_at <= now() AS due
                    FROM push_deliveries WHERE subscription_id=:subscription AND event_id=:event
                """), {"subscription": item["id"], "event": item["event_id"]})).mappings().first()
                if previous and (previous["status"] != "pending" or not previous["due"]):
                    continue
                try:
                    status = await asyncio.to_thread(sender, item, item["event_id"], settings)
                except Exception:
                    # Do not log exceptions containing endpoints, keys or payloads.
                    status = 0
                attempts = (previous["attempts"] if previous else 0) + 1
                outcome = delivery_status(status, attempts)
                await session.execute(text("""
                    INSERT INTO push_deliveries
                        (subscription_id, event_id, attempts, status, next_attempt_at)
                    VALUES (:subscription, :event, :attempts, :status,
                            now() + :delay * interval '1 second')
                    ON CONFLICT (subscription_id, event_id) DO UPDATE
                    SET attempts = EXCLUDED.attempts, status = EXCLUDED.status,
                        next_attempt_at = EXCLUDED.next_attempt_at
                """), {
                    "subscription": item["id"], "event": item["event_id"],
                    "attempts": attempts, "status": outcome,
                    "delay": min(3600, 30 * 2 ** attempts),
                })
                if outcome == "expired":
                    await session.execute(text(
                        "UPDATE push_subscriptions SET enabled = false WHERE id = :id"
                    ), {"id": item["id"]})
                if outcome in ("pending", "failed"):
                    logger.warning("push_delivery event=%s outcome=%s http=%s",
                                   item["event_id"], outcome, status)


async def push_loop():
    while True:
        try:
            await dispatch_batch()
        except Exception as exc:
            logger.warning("push_worker_unavailable type=%s", type(exc).__name__)
        await asyncio.sleep(15)
