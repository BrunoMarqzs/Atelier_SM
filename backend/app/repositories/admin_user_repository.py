from sqlalchemy import select

from app.models.admin_user import AdminUser
from app.repositories.base import BaseRepository


class AdminUserRepository(BaseRepository[AdminUser]):
    model = AdminUser

    async def get(self, admin_id: int) -> AdminUser | None:
        return await self.session.get(AdminUser, admin_id)

    async def find_by_email(self, email: str) -> AdminUser | None:
        result = await self.session.execute(
            select(AdminUser).where(AdminUser.email == email.lower())
        )
        return result.scalar_one_or_none()
