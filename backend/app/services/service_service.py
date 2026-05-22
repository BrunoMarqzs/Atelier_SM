from sqlalchemy.ext.asyncio import AsyncSession

from app.factories.service_factory import ServiceFactory
from app.models.service import Service
from app.repositories.service_repository import ServiceRepository
from app.utils.errors import NotFoundError
from app.validators.service import ServiceCreate, ServiceUpdate


class ServiceService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = ServiceRepository(session)
        self.factory = ServiceFactory()

    async def list_active(self) -> list[Service]:
        return await self.repository.list_active()

    async def list_highlighted(self) -> list[Service]:
        return await self.repository.list_highlighted()

    async def list_all(self) -> list[Service]:
        return await self.repository.list_all()

    async def get_required(self, service_id: int) -> Service:
        service = await self.repository.get(service_id)
        if not service:
            raise NotFoundError("Serviço não encontrado.")
        return service

    async def create(self, payload: ServiceCreate) -> Service:
        return await self.repository.add(self.factory.create(payload))

    async def update(self, service_id: int, payload: ServiceUpdate) -> Service:
        service = await self.get_required(service_id)
        changes = payload.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(service, field, value)
        return service

    async def deactivate(self, service_id: int) -> Service:
        service = await self.get_required(service_id)
        service.is_active = False
        return service
