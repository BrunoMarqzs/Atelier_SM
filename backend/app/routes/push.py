# ruff: noqa: B008
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
from app.config.settings import get_settings
from app.models.admin_user import AdminUser
from app.services.push_service import PushSubscriptionInput, configured
from app.utils.security import require_admin_user

router = APIRouter(prefix="/admin/push", tags=["Admin push"])


def push_admin(admin: AdminUser = Depends(require_admin_user)):
    if admin.id != get_settings().push_admin_id:
        raise HTTPException(403, "Notificações restritas à administradora configurada.")
    return admin


class EndpointInput(BaseModel):
    endpoint: str = Field(max_length=2048)


@router.get("/config")
async def config(admin: AdminUser = Depends(push_admin)):
    settings = get_settings()
    return {"enabled": configured(settings), "publicKey": settings.push_vapid_public_key}


@router.post("/status")
async def status(
    payload: EndpointInput,
    admin: AdminUser = Depends(push_admin),
    session: AsyncSession = Depends(get_session),
):
    enabled = await session.scalar(text("""
        SELECT enabled FROM push_subscriptions WHERE endpoint = :endpoint AND admin_id = :admin
    """), {"endpoint": payload.endpoint, "admin": admin.id})
    return {"enabled": bool(enabled) and configured(get_settings())}


@router.post("/subscribe")
async def subscribe(
    payload: PushSubscriptionInput,
    admin: AdminUser = Depends(push_admin),
    session: AsyncSession = Depends(get_session),
):
    if not configured(get_settings()):
        raise HTTPException(503, "Notificações ainda não configuradas ou desligadas no servidor.")
    # Lock admin to bound devices even with concurrent requests.
    await session.execute(text("SELECT id FROM admin_users WHERE id=:id FOR UPDATE"),
                          {"id": admin.id})
    count = await session.scalar(text("""
        SELECT count(*) FROM push_subscriptions
        WHERE admin_id=:admin AND enabled AND endpoint != :endpoint
    """), {"admin": admin.id, "endpoint": payload.endpoint})
    if count >= 10:
        raise HTTPException(409, "Limite de 10 dispositivos. Desative os que não utiliza.")
    result = await session.execute(text("""
        INSERT INTO push_subscriptions (admin_id, endpoint, p256dh, auth, after_event_id)
        VALUES (:admin, :endpoint, :p256dh, :auth, (SELECT COALESCE(max(id),0) FROM notifications))
        ON CONFLICT (endpoint) DO UPDATE SET
            p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth, enabled=true,
            after_event_id=CASE WHEN push_subscriptions.enabled
                THEN push_subscriptions.after_event_id ELSE EXCLUDED.after_event_id END
        WHERE push_subscriptions.admin_id = EXCLUDED.admin_id
        RETURNING id
    """), {"admin": admin.id, **payload.model_dump()})
    if result.scalar() is None:
        raise HTTPException(409, "Dispositivo vinculado a outra conta administrativa.")
    await session.commit()
    return {"enabled": True}


@router.post("/unsubscribe")
async def unsubscribe(
    payload: EndpointInput,
    admin: AdminUser = Depends(push_admin),
    session: AsyncSession = Depends(get_session),
):
    await session.execute(text("""
        UPDATE push_subscriptions SET enabled=false WHERE endpoint=:endpoint AND admin_id=:admin
    """), {"endpoint": payload.endpoint, "admin": admin.id})
    await session.commit()
    return {"enabled": False}
