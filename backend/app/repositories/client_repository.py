from sqlalchemy import select

from app.models.client_profile import ClientProfile
from app.repositories.base import BaseRepository


class ClientRepository(BaseRepository[ClientProfile]):
    model = ClientProfile

    async def get_by_normalized_phone(self, normalized_phone: str) -> ClientProfile | None:
        result = await self.session.execute(
            select(ClientProfile).where(ClientProfile.normalized_phone == normalized_phone)
        )
        return result.scalar_one_or_none()
