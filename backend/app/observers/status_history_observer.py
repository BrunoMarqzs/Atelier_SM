from app.models.status_history import StatusHistory
from app.observers.events import StatusChangedEvent
from app.repositories.status_history_repository import StatusHistoryRepository


class StatusHistoryObserver:
    def __init__(self, repository: StatusHistoryRepository) -> None:
        self.repository = repository

    async def handle(self, event: StatusChangedEvent) -> None:
        await self.repository.add(
            StatusHistory(
                request_id=event.request_id,
                from_status=event.from_status,
                to_status=event.to_status,
                comment=event.comment,
                changed_by=event.changed_by,
            )
        )
