from datetime import UTC, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.enums import PaymentStatus
from app.models.payment import Payment
from app.services.payment_service import PaymentService
from app.utils.errors import ConflictError, NotFoundError
from app.validators.payment import MockPaymentCreate, PaymentStatusUpdate


def build_service() -> PaymentService:
    return PaymentService(session=None)  # type: ignore[arg-type]


@pytest.mark.anyio
async def test_create_mock_payment_requires_existing_order() -> None:
    service = build_service()

    class FakeRequestRepository:
        async def get(self, _order_id):
            return None

    service.request_repository = FakeRequestRepository()

    with pytest.raises(NotFoundError, match="Pedido"):
        await service.create_mock_for_order(99, MockPaymentCreate(amount=Decimal("120.00")))


@pytest.mark.anyio
async def test_create_mock_payment_rejects_duplicate_order_payment() -> None:
    service = build_service()

    class FakeRequestRepository:
        async def get(self, _order_id):
            return SimpleNamespace(id=99)

    class FakePaymentRepository:
        async def get_by_order_id(self, _order_id):
            return SimpleNamespace(id=1)

    service.request_repository = FakeRequestRepository()
    service.repository = FakePaymentRepository()

    with pytest.raises(ConflictError, match="jÃ¡ possui"):
        await service.create_mock_for_order(99, MockPaymentCreate(amount=Decimal("120.00")))


@pytest.mark.anyio
async def test_create_mock_payment_uses_mock_pix_defaults() -> None:
    service = build_service()

    class FakeRequestRepository:
        async def get(self, _order_id):
            return SimpleNamespace(id=99)

    class FakePaymentRepository:
        async def get_by_order_id(self, _order_id):
            return None

        async def add(self, payment):
            payment.id = 7
            return payment

    service.request_repository = FakeRequestRepository()
    service.repository = FakePaymentRepository()

    payment = await service.create_mock_for_order(
        99,
        MockPaymentCreate(
            amount=Decimal("120.00"),
            pix_copy_paste="pix-copia-e-cola",
        ),
    )

    assert isinstance(payment, Payment)
    assert payment.order_id == 99
    assert payment.provider.value == "mock"
    assert payment.method.value == "pix"
    assert payment.status == PaymentStatus.WAITING_PAYMENT
    assert payment.amount == Decimal("120.00")
    assert payment.pix_copy_paste == "pix-copia-e-cola"
    assert payment.expires_at is not None


@pytest.mark.anyio
async def test_get_by_order_expires_waiting_payment_after_deadline() -> None:
    service = build_service()
    payment = SimpleNamespace(
        id=7,
        order_id=99,
        status=PaymentStatus.WAITING_PAYMENT,
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )

    class FakePaymentRepository:
        async def get_by_order_id(self, _order_id):
            return payment

    class FakeSession:
        def __init__(self) -> None:
            self.flushed = False

        async def flush(self):
            self.flushed = True

    service.repository = FakePaymentRepository()
    service.session = FakeSession()

    updated = await service.get_by_order_id(99)

    assert updated.status == PaymentStatus.EXPIRED
    assert service.session.flushed is True


@pytest.mark.anyio
async def test_update_status_to_paid_sets_paid_at() -> None:
    service = build_service()
    payment = SimpleNamespace(
        id=7,
        status=PaymentStatus.WAITING_PAYMENT,
        paid_at=None,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )

    class FakePaymentRepository:
        async def get(self, _payment_id):
            return payment

    class FakeSession:
        def __init__(self) -> None:
            self.flushed = False

        async def flush(self):
            self.flushed = True

    service.repository = FakePaymentRepository()
    service.session = FakeSession()

    updated = await service.update_status(7, PaymentStatusUpdate(status=PaymentStatus.PAID))

    assert updated.status == PaymentStatus.PAID
    assert updated.paid_at is not None
    assert service.session.flushed is True


@pytest.mark.anyio
async def test_expired_payment_cannot_be_marked_as_paid() -> None:
    service = build_service()
    payment = SimpleNamespace(
        id=7,
        status=PaymentStatus.EXPIRED,
        paid_at=None,
        expires_at=datetime.now(UTC) - timedelta(minutes=1),
    )

    class FakePaymentRepository:
        async def get(self, _payment_id):
            return payment

    class FakeSession:
        async def flush(self):
            return None

    service.repository = FakePaymentRepository()
    service.session = FakeSession()

    with pytest.raises(ConflictError, match="expirado"):
        await service.update_status(7, PaymentStatusUpdate(status=PaymentStatus.PAID))


@pytest.mark.anyio
async def test_paid_payment_cannot_be_reopened() -> None:
    service = build_service()
    payment = SimpleNamespace(
        id=7,
        status=PaymentStatus.PAID,
        paid_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )

    class FakePaymentRepository:
        async def get(self, _payment_id):
            return payment

    class FakeSession:
        async def flush(self):
            return None

    service.repository = FakePaymentRepository()
    service.session = FakeSession()

    with pytest.raises(ConflictError, match="confirmado"):
        await service.update_status(7, PaymentStatusUpdate(status=PaymentStatus.WAITING_PAYMENT))
