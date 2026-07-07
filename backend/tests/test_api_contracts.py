from collections.abc import AsyncGenerator
from decimal import Decimal
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.config.database import get_session
from app.main import create_app
from app.routes import admin, public
from app.utils.security import require_admin_user


class FakeSession:
    image_by_id = {}

    def __init__(self) -> None:
        self.committed = False
        self.refreshed = False

    async def commit(self) -> None:
        self.committed = True

    async def refresh(self, _entity) -> None:
        self.refreshed = True

    async def get(self, _model, entity_id):
        return self.image_by_id.get(entity_id)


async def fake_session_dependency() -> AsyncGenerator[FakeSession, None]:
    yield FakeSession()


def request_payload() -> dict:
    return {
        "client": {"name": "Cliente Teste", "phone": "(31) 99999-0000"},
        "service_id": 10,
        "slot_id": 20,
        "notes": "Ajuste fino no vestido.",
        "image_urls": [],
    }


def request_response(status: str = "pending") -> dict:
    return {
        "id": 99,
        "client_id": 1,
        "service_id": 10,
        "slot_id": 20,
        "public_code": "ABC123XYZ0",
        "status": status,
        "notes": "Ajuste fino no vestido.",
        "admin_comment": None,
        "estimated_price": Decimal("180.00"),
        "images": [],
        "status_history": [],
        "client": None,
        "service": None,
        "slot": None,
    }


def build_client() -> TestClient:
    app = create_app()
    app.dependency_overrides[get_session] = fake_session_dependency
    return TestClient(app)


def test_create_request_endpoint_uses_booking_facade_and_returns_contract(monkeypatch) -> None:
    class FakeBookingFacade:
        def __init__(self, session) -> None:
            self.session = session

        async def request_appointment(self, payload):
            assert payload.service_id == 10
            assert payload.slot_id == 20
            return type("Request", (), {"id": 99})()

    class FakeAppointmentRequestService:
        def __init__(self, session) -> None:
            self.session = session

        async def get_required(self, request_id):
            assert request_id == 99
            return request_response()

    monkeypatch.setattr(public, "BookingFacade", FakeBookingFacade)
    monkeypatch.setattr(public, "AppointmentRequestService", FakeAppointmentRequestService)
    client = build_client()

    response = client.post("/api/requests", json=request_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 99
    assert body["status"] == "pending"
    assert body["public_code"] == "ABC123XYZ0"
    assert body["public_url"].endswith("/pedido/ABC123XYZ0")
    assert body["estimated_price"] == "180.00"


def test_public_history_endpoint_uses_phone_and_returns_requests(monkeypatch) -> None:
    class FakeAppointmentRequestService:
        def __init__(self, session) -> None:
            self.session = session

        async def list_public_history_by_phone(self, phone):
            assert phone == "(31) 99999-0000"
            return [request_response(status="approved")]

    monkeypatch.setattr(public, "AppointmentRequestService", FakeAppointmentRequestService)
    client = build_client()

    response = client.get("/api/requests/history", params={"phone": "(31) 99999-0000"})

    assert response.status_code == 200
    body = response.json()
    assert body[0]["id"] == 99
    assert body[0]["status"] == "approved"
    assert body[0]["estimated_price"] == "180.00"


def test_public_request_endpoint_returns_request_by_code(monkeypatch) -> None:
    class FakeAppointmentRequestService:
        def __init__(self, session) -> None:
            self.session = session

        async def get_public_by_code(self, public_code):
            assert public_code == "ABC123XYZ0"
            return request_response(status="under_review")

    monkeypatch.setattr(public, "AppointmentRequestService", FakeAppointmentRequestService)
    client = build_client()

    response = client.get("/api/requests/public/ABC123XYZ0")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == 99
    assert body["status"] == "under_review"
    assert body["public_url"].endswith("/pedido/ABC123XYZ0")


def test_public_request_payment_endpoint_returns_read_only_payment(monkeypatch) -> None:
    class FakePaymentService:
        def __init__(self, session) -> None:
            self.session = session

        async def get_by_public_code(self, public_code):
            assert public_code == "ABC123XYZ0"
            return payment_response()

    monkeypatch.setattr(public, "PaymentService", FakePaymentService)
    client = build_client()

    response = client.get("/api/requests/public/ABC123XYZ0/payment")

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "mock"
    assert body["method"] == "pix"
    assert body["status"] == "waiting_payment"


def test_public_image_file_endpoint_serves_database_image() -> None:
    FakeSession.image_by_id = {
        7: SimpleNamespace(
            content_bytes=b"\xff\xd8\xff\xe0content",
            mime_type="image/jpeg",
            original_filename="vestido.jpg",
        )
    }
    client = build_client()

    response = client.get("/api/requests/images/7/file")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.content == b"\xff\xd8\xff\xe0content"
    FakeSession.image_by_id = {}


def test_admin_routes_require_authentication() -> None:
    client = build_client()

    response = client.get("/api/admin/dashboard")

    assert response.status_code == 401
    assert response.json()["detail"] == "Sessão administrativa obrigatória."


def test_admin_status_endpoint_requires_admin_and_delegates_command(monkeypatch) -> None:
    class FakeChangeRequestStatusCommand:
        def __init__(self, session) -> None:
            self.session = session

        async def execute(self, *, request_id, status, comment, estimated_price):
            assert request_id == 99
            assert status.value == "approved"
            assert comment == "Aprovado com ajuste de barra."
            assert estimated_price == Decimal("220.00")
            return type("Request", (), {"id": 99})()

    class FakeAppointmentRequestService:
        def __init__(self, session) -> None:
            self.session = session

        async def get_required(self, request_id):
            assert request_id == 99
            return request_response(status="approved")

    async def fake_admin_user():
        return object()

    monkeypatch.setattr(admin, "ChangeRequestStatusCommand", FakeChangeRequestStatusCommand)
    monkeypatch.setattr(admin, "AppointmentRequestService", FakeAppointmentRequestService)
    client = build_client()
    client.app.dependency_overrides[require_admin_user] = fake_admin_user

    response = client.patch(
        "/api/admin/requests/99/status",
        json={
            "status": "approved",
            "comment": "Aprovado com ajuste de barra.",
            "estimated_price": "220.00",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"


def test_admin_audit_endpoint_requires_admin_and_returns_logs(monkeypatch) -> None:
    class FakeAuditService:
        def __init__(self, session) -> None:
            self.session = session

        async def list(self, request_id=None, limit=100):
            assert request_id == 99
            assert limit == 10
            return [
                {
                    "id": 1,
                    "entity_type": "appointment_request",
                    "entity_id": 99,
                    "action": "status_changed",
                    "changed_by": "admin",
                    "request_id": 99,
                    "before_snapshot": {"status": "pending"},
                    "after_snapshot": {"status": "under_review"},
                    "created_at": "2026-05-21T09:00:00Z",
                }
            ]

    async def fake_admin_user():
        return object()

    monkeypatch.setattr(admin, "AuditService", FakeAuditService)
    client = build_client()
    client.app.dependency_overrides[require_admin_user] = fake_admin_user

    response = client.get("/api/admin/audit", params={"request_id": 99, "limit": 10})

    assert response.status_code == 200
    body = response.json()
    assert body[0]["action"] == "status_changed"
    assert body[0]["before_snapshot"]["status"] == "pending"


def test_admin_schedule_config_endpoint_requires_admin_and_returns_policy(monkeypatch) -> None:
    class FakeSchedulePolicyService:
        def __init__(self, session) -> None:
            self.session = session

        async def get_config(self):
            return {
                "id": 1,
                "opening_time": "08:00",
                "closing_time": "19:00",
                "lunch_block_hours": [11, 12, 13],
                "weekly_hours": {"0": [8, 9, 10, 14, 15, 16, 17], "6": []},
            }

    async def fake_admin_user():
        return object()

    monkeypatch.setattr(admin, "SchedulePolicyService", FakeSchedulePolicyService)
    client = build_client()
    client.app.dependency_overrides[require_admin_user] = fake_admin_user

    response = client.get("/api/admin/schedule/config")

    assert response.status_code == 200
    body = response.json()
    assert body["opening_time"] == "08:00"
    assert body["weekly_hours"]["0"] == [8, 9, 10, 14, 15, 16, 17]
    assert body["weekly_hours"]["6"] == []


def test_admin_notifications_endpoint_returns_internal_events(monkeypatch) -> None:
    class FakeNotificationService:
        def __init__(self, session) -> None:
            self.session = session

        async def list(self, unread_only=False, limit=80):
            assert unread_only is True
            assert limit == 5
            return [
                {
                    "id": 7,
                    "event_type": "request_created",
                    "channel": "internal",
                    "recipient_type": "admin",
                    "recipient": None,
                    "title": "Novo pedido recebido",
                    "message": "Cliente enviou uma solicitação.",
                    "request_id": 99,
                    "read_at": None,
                    "created_at": "2026-05-22T10:00:00Z",
                }
            ]

    async def fake_admin_user():
        return object()

    monkeypatch.setattr(admin, "NotificationService", FakeNotificationService)
    client = build_client()
    client.app.dependency_overrides[require_admin_user] = fake_admin_user

    response = client.get(
        "/api/admin/notifications",
        params={"unread_only": True, "limit": 5},
    )

    assert response.status_code == 200
    body = response.json()
    assert body[0]["event_type"] == "request_created"
    assert body[0]["request_id"] == 99


def test_admin_schedule_exception_endpoint_upserts_closed_day(monkeypatch) -> None:
    class FakeSchedulePolicyService:
        def __init__(self, session) -> None:
            self.session = session

        async def upsert_exception(self, payload):
            assert str(payload.exception_date) == "2026-12-24"
            assert payload.kind == "closed"
            return {
                "id": 11,
                "exception_date": payload.exception_date,
                "kind": payload.kind,
                "hours": payload.hours,
                "reason": payload.reason,
            }

    async def fake_admin_user():
        return object()

    monkeypatch.setattr(admin, "SchedulePolicyService", FakeSchedulePolicyService)
    client = build_client()
    client.app.dependency_overrides[require_admin_user] = fake_admin_user

    response = client.post(
        "/api/admin/schedule/exceptions",
        json={
            "exception_date": "2026-12-24",
            "kind": "closed",
            "reason": "Véspera de Natal",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["exception_date"] == "2026-12-24"
    assert body["kind"] == "closed"


def payment_response(status: str = "waiting_payment") -> dict:
    return {
        "id": 7,
        "order_id": 99,
        "provider": "mock",
        "method": "pix",
        "status": status,
        "amount": Decimal("120.00"),
        "pix_qr_code": None,
        "pix_copy_paste": "pix-copia-e-cola",
        "external_payment_id": None,
        "paid_at": None,
        "expires_at": None,
        "created_at": "2026-07-06T10:00:00Z",
        "updated_at": "2026-07-06T10:00:00Z",
    }


def test_admin_create_mock_payment_for_order(monkeypatch) -> None:
    class FakePaymentService:
        def __init__(self, session) -> None:
            self.session = session

        async def create_mock_for_order(self, order_id, payload):
            assert order_id == 99
            assert payload.amount == Decimal("120.00")
            assert payload.pix_copy_paste == "pix-copia-e-cola"
            return payment_response()

    async def fake_admin_user():
        return object()

    monkeypatch.setattr(admin, "PaymentService", FakePaymentService)
    client = build_client()
    client.app.dependency_overrides[require_admin_user] = fake_admin_user

    response = client.post(
        "/api/admin/requests/99/payments",
        json={"amount": "120.00", "pix_copy_paste": "pix-copia-e-cola"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["order_id"] == 99
    assert body["provider"] == "mock"
    assert body["method"] == "pix"
    assert body["status"] == "waiting_payment"
    assert body["amount"] == "120.00"


def test_admin_get_payment_by_order(monkeypatch) -> None:
    class FakePaymentService:
        def __init__(self, session) -> None:
            self.session = session

        async def get_by_order_id(self, order_id):
            assert order_id == 99
            return payment_response()

    async def fake_admin_user():
        return object()

    monkeypatch.setattr(admin, "PaymentService", FakePaymentService)
    client = build_client()
    client.app.dependency_overrides[require_admin_user] = fake_admin_user

    response = client.get("/api/admin/requests/99/payment")

    assert response.status_code == 200
    assert response.json()["id"] == 7


def test_admin_update_payment_status(monkeypatch) -> None:
    class FakePaymentService:
        def __init__(self, session) -> None:
            self.session = session

        async def update_status(self, payment_id, payload):
            assert payment_id == 7
            assert payload.status.value == "paid"
            return payment_response(status="paid") | {"paid_at": "2026-07-06T10:05:00Z"}

    async def fake_admin_user():
        return object()

    monkeypatch.setattr(admin, "PaymentService", FakePaymentService)
    client = build_client()
    client.app.dependency_overrides[require_admin_user] = fake_admin_user

    response = client.patch("/api/admin/payments/7/status", json={"status": "paid"})

    assert response.status_code == 200
    assert response.json()["status"] == "paid"
