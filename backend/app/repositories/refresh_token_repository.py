from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.refresh_token import RefreshToken
from app.repositories.base import BaseRepository


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    model = RefreshToken

    async def find_by_hash(self, token_hash: str) -> RefreshToken | None:
        result = await self.session.execute(
            select(RefreshToken)
            .options(selectinload(RefreshToken.admin_user))
            .where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()
