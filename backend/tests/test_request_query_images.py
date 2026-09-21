"""Exercise real ORM loading with synthetic data in an isolated in-memory database."""

from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine, event, inspect
from sqlalchemy.orm import Session

from app.config.database import Base
from app.models import (
    AppointmentRequest,
    AvailabilitySlot,
    ClientProfile,
    PriceType,
    RequestImage,
    Service,
    StorageProvider,
)
from app.repositories.request_repository import AppointmentRequestRepository
from app.validators.request import AppointmentRequestRead


class AsyncReadAdapter:
    def __init__(self, session):
        self.session = session

    async def execute(self, statement):
        return self.session.execute(statement)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "lookup", ["get", "get_by_public_code", "list_requests", "list_by_client_phone"]
)
async def test_request_queries_omit_binary_but_keep_image_metadata(lookup):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    content = b"synthetic-image" * 1024
    with Session(engine) as session:
        start = datetime(2026, 9, 22, 8)
        request = AppointmentRequest(
            client=ClientProfile(name="Test", phone="83999999999", normalized_phone="83999999999"),
            service=Service(
                name="Test",
                description="Test",
                category="Test",
                duration_minutes=30,
                price_type=PriceType.QUOTE,
            ),
            slot=AvailabilitySlot(starts_at=start, ends_at=start + timedelta(minutes=30)),
            public_code="TEST123",
            images=[
                RequestImage(
                    storage_provider=StorageProvider.LOCAL,
                    url="/api/requests/images/1/file",
                    mime_type="image/jpeg",
                    size_bytes=len(content),
                    content_bytes=content,
                )
            ],
        )
        session.add(request)
        session.commit()

    statements = []
    event.listen(
        engine, "before_cursor_execute", lambda c, cur, sql, p, ctx, many: statements.append(sql)
    )
    try:
        with Session(engine) as session:
            repository = AppointmentRequestRepository(AsyncReadAdapter(session))
            args = {
                "get": (1,),
                "get_by_public_code": ("TEST123",),
                "list_requests": (),
                "list_by_client_phone": ("83999999999",),
            }
            result = await getattr(repository, lookup)(*args[lookup])
            request = result[0] if isinstance(result, list) else result
            image = request.images[0]
            assert "content_bytes" in inspect(image).unloaded
            assert all("content_bytes" not in sql for sql in statements)
            payload = AppointmentRequestRead.model_validate(request).model_dump()
            assert payload["images"][0]["url"] == "/api/requests/images/1/file"
            assert payload["images"][0]["size_bytes"] == len(content)
            assert "content_bytes" not in payload["images"][0]

        # The image endpoint uses a separate session.get; its binary remains available.
        with Session(engine) as session:
            assert session.get(RequestImage, 1).content_bytes == content
    finally:
        engine.dispose()
