from sqlalchemy.ext.asyncio import AsyncSession

from app.factories.client_factory import ClientProfileFactory
from app.models.client_profile import ClientProfile
from app.repositories.client_repository import ClientRepository
from app.validators.client import ClientIdentityInput, normalize_phone


class ClientService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = ClientRepository(session)
        self.factory = ClientProfileFactory()

    async def get_or_create(self, payload: ClientIdentityInput) -> ClientProfile:
        normalized_phone = normalize_phone(payload.phone)
        existing = await self.repository.get_by_normalized_phone(normalized_phone)
        if existing:
            existing.name = payload.name.strip()
            existing.phone = payload.phone.strip()
            return existing
        return await self.repository.add(self.factory.create(payload))
