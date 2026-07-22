from sqlalchemy.ext.asyncio import AsyncSession

from app.models.announcement import Announcement
from app.repositories.announcement_repository import AnnouncementRepository
from app.utils.errors import NotFoundError
from app.validators.announcement import AnnouncementCreate, AnnouncementUpdate


class AnnouncementService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = AnnouncementRepository(session)

    async def list_public_active(self) -> list[Announcement]:
        return await self.repository.list_active_public()

    async def list_admin(self) -> list[Announcement]:
        return await self.repository.list_all()

    async def get_required(self, announcement_id: int) -> Announcement:
        announcement = await self.repository.get(announcement_id)
        if not announcement:
            raise NotFoundError("Anúncio não encontrado.")
        return announcement

    async def create(self, payload: AnnouncementCreate) -> Announcement:
        announcement = Announcement(**payload.model_dump())
        return await self.repository.add(announcement)

    async def update(self, announcement_id: int, payload: AnnouncementUpdate) -> Announcement:
        announcement = await self.get_required(announcement_id)
        changes = payload.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(announcement, field, value)
        return announcement

    async def deactivate(self, announcement_id: int) -> Announcement:
        announcement = await self.get_required(announcement_id)
        announcement.is_active = False
        return announcement
