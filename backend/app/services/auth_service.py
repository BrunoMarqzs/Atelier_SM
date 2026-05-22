import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.models.admin_user import AdminUser
from app.models.refresh_token import RefreshToken
from app.repositories.admin_user_repository import AdminUserRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.utils.errors import TooManyRequestsError, UnauthorizedError
from app.utils.jwt import create_access_token
from app.utils.passwords import hash_token, verify_password
from app.validators.auth import AuthTokenRead


class AuthRateLimiter:
    def __init__(self) -> None:
        self._attempts: dict[str, list[datetime]] = {}

    def register_attempt(self, key: str) -> None:
        settings = get_settings()
        now = datetime.now(UTC)
        window_start = now - timedelta(seconds=settings.auth_rate_limit_window_seconds)
        attempts = [item for item in self._attempts.get(key, []) if item >= window_start]
        attempts.append(now)
        self._attempts[key] = attempts
        if len(attempts) > settings.auth_rate_limit_attempts:
            raise TooManyRequestsError("Muitas tentativas de login. Aguarde alguns minutos.")

    def reset(self, key: str) -> None:
        self._attempts.pop(key, None)


rate_limiter = AuthRateLimiter()


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.admin_users = AdminUserRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)

    async def login(self, *, email: str, password: str, client_key: str) -> AuthTokenRead:
        normalized_email = email.strip().lower()
        limiter_key = f"{client_key}:{normalized_email}"
        rate_limiter.register_attempt(limiter_key)

        admin = await self.admin_users.find_by_email(normalized_email)
        if not admin or not admin.is_active or not verify_password(password, admin.password_hash):
            raise UnauthorizedError("E-mail ou senha inválidos.")

        rate_limiter.reset(limiter_key)
        return await self.issue_session(admin)

    async def refresh(self, refresh_token: str) -> AuthTokenRead:
        token_hash = hash_token(refresh_token)
        stored_token = await self.refresh_tokens.find_by_hash(token_hash)
        now = datetime.now(UTC)
        if (
            not stored_token
            or stored_token.revoked_at is not None
            or stored_token.expires_at <= now
            or not stored_token.admin_user.is_active
        ):
            raise UnauthorizedError("Refresh token inválido.")

        stored_token.revoked_at = now
        return await self.issue_session(stored_token.admin_user)

    async def logout(self, refresh_token: str) -> None:
        stored_token = await self.refresh_tokens.find_by_hash(hash_token(refresh_token))
        if stored_token and stored_token.revoked_at is None:
            stored_token.revoked_at = datetime.now(UTC)

    async def issue_session(self, admin: AdminUser) -> AuthTokenRead:
        settings = get_settings()
        raw_refresh_token = secrets.token_urlsafe(48)
        expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
        await self.refresh_tokens.add(
            RefreshToken(
                admin_user_id=admin.id,
                token_hash=hash_token(raw_refresh_token),
                expires_at=expires_at,
            )
        )
        access_token = create_access_token(subject=admin.email, admin_id=admin.id)
        return AuthTokenRead(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )
