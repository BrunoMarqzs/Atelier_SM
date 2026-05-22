from sqlalchemy import select

from app.models.service import Service
from app.repositories.base import BaseRepository


class ServiceRepository(BaseRepository[Service]):
    model = Service

    async def get(self, service_id: int) -> Service | None:
        return await self.session.get(Service, service_id)

    async def list_active(self) -> list[Service]:
        result = await self.session.execute(
            select(Service)
            .where(Service.is_active.is_(True))
            .order_by(Service.highlighted.desc(), Service.name)
        )
        return list(result.scalars().all())

    async def list_highlighted(self) -> list[Service]:
        result = await self.session.execute(
            select(Service)
            .where(Service.is_active.is_(True), Service.highlighted.is_(True))
            .order_by(Service.name)
        )
        return list(result.scalars().all())

    async def list_all(self) -> list[Service]:
        result = await self.session.execute(select(Service).order_by(Service.name))
        return list(result.scalars().all())
