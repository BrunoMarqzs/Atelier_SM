from types import SimpleNamespace

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.enums import AppointmentStatus, AvailabilityStatus, StorageProvider
from app.services.request_service import AppointmentRequestService
from app.utils.errors import ConflictError
from app.validators.client import ClientIdentityInput
from app.validators.request import AppointmentRequestCreate


def build_service() -> AppointmentRequestService:
    return AppointmentRequestService(session=None)  # type: ignore[arg-type]


def payload() -> AppointmentRequestCreate:
    return AppointmentRequestCreate(
        client=ClientIdentityInput(name="Cliente Teste", phone="31999990000"),
        service_id=1,
        slot_id=2,
        notes="Vestido de festa.",
        image_urls=["https://cdn.example.com/referencia.jpg"],
    )


class FakeAuditService:
    def __init__(self) -> None:
        self.records = []

    async def record(self, **kwargs):
        self.records.append(kwargs)


class FakeStatusObserver:
    def __init__(self) -> None:
        self.events = []

    async def handle(self, event):
        self.events.append(event)


class FakeNotificationService:
    def __init__(self) -> None:
        self.notifications = []

    async def create_internal(self, **kwargs):
        self.notifications.append(kwargs)


@pytest.mark.anyio
async def test_create_rejects_inactive_service_before_reserving_slot() -> None:
    service = build_service()
    reservation_called = False

    class FakeClientService:
        async def get_or_create(self, _client):
            return SimpleNamespace(id=10)

    class FakeServiceService:
        async def get_required(self, _service_id):
            return SimpleNamespace(id=1, is_active=False)

    class FakeAvailabilityService:
        async def reserve_slot(self, _slot_id):
            nonlocal reservation_called
            reservation_called = True

    service.client_service = FakeClientService()
    service.service_service = FakeServiceService()
    service.availability_service = FakeAvailabilityService()

    with pytest.raises(ConflictError, match="indisponível"):
        await service.create(payload())

    assert reservation_called is False


@pytest.mark.anyio
async def test_create_converts_duplicate_slot_integrity_error_to_conflict() -> None:
    service = build_service()

    class FakeClientService:
        async def get_or_create(self, _client):
            return SimpleNamespace(id=10)

    class FakeServiceService:
        async def get_required(self, _service_id):
            return SimpleNamespace(id=1, is_active=True, price_type="quote", fixed_price=None)

    class FakeAvailabilityService:
        async def reserve_slot(self, _slot_id):
            return SimpleNamespace(id=2, status=AvailabilityStatus.BOOKED)

    class FakeRepository:
        async def get_by_public_code(self, _public_code):
            return None

        async def add(self, _request):
            raise IntegrityError("insert", {}, Exception("duplicate slot"))

    service.client_service = FakeClientService()
    service.service_service = FakeServiceService()
    service.availability_service = FakeAvailabilityService()
    service.repository = FakeRepository()
    service.audit_service = FakeAuditService()

    with pytest.raises(ConflictError, match="já reservado"):
        await service.create(payload())


@pytest.mark.anyio
async def test_add_image_persists_storage_metadata() -> None:
    service = build_service()
    request = SimpleNamespace(id=11, images=[])

    async def fake_get_required(_request_id):
        return request

    class FakeSession:
        def __init__(self) -> None:
            self.flushed = False

        async def flush(self):
            self.flushed = True

    service.session = FakeSession()
    service.get_required = fake_get_required  # type: ignore[method-assign]

    image = await service.add_image(
        11,
        SimpleNamespace(
            provider=StorageProvider.LOCAL,
            url="http://localhost/uploads/full.jpg",
            thumbnail_url="http://localhost/uploads/thumb.jpg",
            public_id="2026/05/full.jpg",
            original_filename="vestido.jpg",
            mime_type="image/jpeg",
            size_bytes=2048,
            content_bytes=None,
        ),
    )

    assert image.request_id == 11
    assert image.thumbnail_url == "http://localhost/uploads/thumb.jpg"
    assert image.size_bytes == 2048
    assert service.session.flushed is True
    assert request.images == [image]


@pytest.mark.anyio
async def test_add_image_exposes_database_image_route() -> None:
    service = build_service()
    request = SimpleNamespace(id=11, images=[])

    async def fake_get_required(_request_id):
        return request

    class FakeSession:
        def __init__(self) -> None:
            self.flushes = 0

        async def flush(self):
            self.flushes += 1
            for image in request.images:
                image.id = 77

    service.session = FakeSession()
    service.get_required = fake_get_required  # type: ignore[method-assign]

    image = await service.add_image(
        11,
        SimpleNamespace(
            provider=StorageProvider.LOCAL,
            url="",
            thumbnail_url=None,
            public_id="database/full.jpg",
            original_filename="vestido.jpg",
            mime_type="image/jpeg",
            size_bytes=2048,
            content_bytes=b"\xff\xd8\xff\xe0content",
        ),
    )

    assert image.url == "/api/requests/images/77/file"
    assert image.thumbnail_url == image.url
    assert image.content_bytes == b"\xff\xd8\xff\xe0content"
    assert service.session.flushes == 2


@pytest.mark.anyio
async def test_reschedule_moves_request_and_releases_old_slot() -> None:
    service = build_service()
    old_slot = SimpleNamespace(id=2, status=AvailabilityStatus.BOOKED, reason=None)
    new_slot = SimpleNamespace(id=3, status=AvailabilityStatus.BOOKED, reason=None)
    request = SimpleNamespace(
        admin_comment=None,
        estimated_price=None,
        id=44,
        slot=old_slot,
        slot_id=old_slot.id,
        status=AppointmentStatus.APPROVED,
    )

    async def fake_get_required(_request_id):
        return request

    class FakeAvailabilityService:
        async def reserve_slot(self, slot_id):
            assert slot_id == new_slot.id
            return new_slot

    audit_service = FakeAuditService()
    status_observer = FakeStatusObserver()
    notification_service = FakeNotificationService()
    service.get_required = fake_get_required  # type: ignore[method-assign]
    service.availability_service = FakeAvailabilityService()
    service.audit_service = audit_service
    service.status_observer = status_observer
    service.notification_service = notification_service

    updated = await service.reschedule(
        request_id=request.id,
        new_slot_id=new_slot.id,
        comment="Remarcado para novo horário.",
    )

    assert updated.slot_id == new_slot.id
    assert old_slot.status == AvailabilityStatus.AVAILABLE
    assert old_slot.reason is None
    assert audit_service.records[0]["action"] == "rescheduled"
    assert status_observer.events[0].comment == "Remarcado para novo horário."
    assert notification_service.notifications[0]["event_type"] == "request_rescheduled"


@pytest.mark.anyio
async def test_client_cannot_reschedule_completed_request() -> None:
    service = build_service()
    request = SimpleNamespace(
        id=45,
        client=SimpleNamespace(normalized_phone="31999990000"),
        status=AppointmentStatus.COMPLETED,
    )

    async def fake_get_required(_request_id):
        return request

    service.get_required = fake_get_required  # type: ignore[method-assign]

    with pytest.raises(ConflictError, match="não permite"):
        await service.client_reschedule(
            request_id=request.id,
            phone="(31) 99999-0000",
            new_slot_id=3,
            comment=None,
        )
