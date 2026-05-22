from sqlalchemy.ext.asyncio import AsyncSession

from app.models.availability_slot import AvailabilitySlot
from app.services.availability_service import AvailabilityService
from app.validators.availability import BlockSlotInput


class BlockSlotCommand:
    def __init__(self, session: AsyncSession) -> None:
        self.availability_service = AvailabilityService(session)

    async def execute(self, payload: BlockSlotInput) -> AvailabilitySlot:
        return await self.availability_service.block_slot(payload)
