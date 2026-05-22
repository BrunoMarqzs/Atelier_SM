# ruff: noqa: B008

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
from app.models.admin_user import AdminUser
from app.repositories.admin_user_repository import AdminUserRepository
from app.utils.errors import UnauthorizedError
from app.utils.jwt import decode_jwt

bearer_scheme = HTTPBearer(auto_error=False)


async def require_admin_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> AdminUser:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Sessão administrativa obrigatória.")

    payload = decode_jwt(credentials.credentials)
    admin_id = payload.get("admin_id")
    if not isinstance(admin_id, int):
        raise UnauthorizedError("Sessão administrativa inválida.")

    admin = await AdminUserRepository(session).get(admin_id)
    if not admin or not admin.is_active:
        raise UnauthorizedError("Usuário administrativo inválido.")
    return admin
