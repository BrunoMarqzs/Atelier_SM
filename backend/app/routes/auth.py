# ruff: noqa: B008

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
from app.models.admin_user import AdminUser
from app.services.auth_service import AuthService
from app.utils.security import require_admin_user
from app.validators.auth import (
    AdminLoginInput,
    AdminSessionRead,
    AuthTokenRead,
    RefreshTokenInput,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/admin/login", response_model=AuthTokenRead)
async def admin_login(
    payload: AdminLoginInput,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> AuthTokenRead:
    tokens = await AuthService(session).login(
        email=payload.email,
        password=payload.password,
        client_key=client_key(request),
    )
    await session.commit()
    return tokens


@router.post("/admin/refresh", response_model=AuthTokenRead)
async def refresh_admin_session(
    payload: RefreshTokenInput,
    session: AsyncSession = Depends(get_session),
) -> AuthTokenRead:
    tokens = await AuthService(session).refresh(payload.refresh_token)
    await session.commit()
    return tokens


@router.post("/admin/logout")
async def logout_admin_session(
    payload: RefreshTokenInput,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await AuthService(session).logout(payload.refresh_token)
    await session.commit()
    return {"message": "Sessão encerrada com sucesso."}


@router.get("/admin/me", response_model=AdminSessionRead)
async def get_admin_session(admin: AdminUser = Depends(require_admin_user)) -> AdminSessionRead:
    return AdminSessionRead(
        id=admin.id,
        name=admin.name,
        email=admin.email,
        is_superuser=admin.is_superuser,
    )
