from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.factories.request_factory import AppointmentRequestFactory
from app.mementos.request_memento import AppointmentRequestMemento
from app.models.appointment_request import AppointmentRequest
from app.models.enums import AppointmentStatus, AvailabilityStatus, StorageProvider
from app.models.request_image import RequestImage
from app.observers.events import StatusChangedEvent
from app.observers.status_history_observer import StatusHistoryObserver
from app.repositories.request_repository import AppointmentRequestRepository
from app.repositories.status_history_repository import StatusHistoryRepository
from app.services.audit_service import AuditService
from app.services.availability_service import AvailabilityService
from app.services.client_service import ClientService
from app.services.notification_service import NotificationService
from app.services.service_service import ServiceService
from app.services.status_transition_service import StatusTransitionService
from app.strategies.pricing import PricingStrategyFactory
from app.strategies.storage import StoredImage
from app.utils.errors import ConflictError, ForbiddenError, NotFoundError
from app.utils.public_codes import generate_public_request_code
from app.validators.client import normalize_phone
from app.validators.request import AppointmentRequestCreate


class AppointmentRequestService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = AppointmentRequestRepository(session)
        self.client_service = ClientService(session)
        self.service_service = ServiceService(session)
        self.availability_service = AvailabilityService(session)
        self.audit_service = AuditService(session)
        self.notification_service = NotificationService(session)
        self.factory = AppointmentRequestFactory()
        self.pricing_factory = PricingStrategyFactory()
        self.status_transitions = StatusTransitionService()
        self.status_observer = StatusHistoryObserver(StatusHistoryRepository(session))

    async def create(self, payload: AppointmentRequestCreate) -> AppointmentRequest:
        client = await self.client_service.get_or_create(payload.client)
        service = await self.service_service.get_required(payload.service_id)
        if not service.is_active:
            raise ConflictError("Serviço indisponível para agendamento.")

        slot = await self.availability_service.reserve_slot(payload.slot_id)
        if slot.status != AvailabilityStatus.BOOKED:
            raise ConflictError("Horário indisponível.")

        pricing = self.pricing_factory.for_service(service)
        estimated_price = pricing.calculate_initial_estimate(service)
        public_code = await self.generate_unique_public_code()
        try:
            request = await self.repository.add(
                self.factory.create(
                    client_id=client.id,
                    service_id=service.id,
                    slot_id=slot.id,
                    notes=payload.notes,
                    estimated_price=estimated_price,
                    public_code=public_code,
                )
            )
        except IntegrityError as exc:
            raise ConflictError("Horário já reservado por outra solicitação.") from exc
        for image_url in payload.image_urls:
            request.images.append(
                RequestImage(
                    storage_provider=StorageProvider.LOCAL,
                    url=image_url,
                    thumbnail_url=image_url,
                    public_id=None,
                    original_filename=None,
                    mime_type="image/jpeg",
                    size_bytes=0,
                )
            )
        await self.status_observer.handle(
            StatusChangedEvent(
                request_id=request.id,
                from_status=None,
                to_status=request.status,
                comment="Solicitação criada pela cliente.",
                changed_by="client",
            )
        )
        await self.audit_service.record(
            entity_type="appointment_request",
            entity_id=request.id,
            action="created",
            changed_by="client",
            before=None,
            after=AppointmentRequestMemento.capture(request).to_audit_snapshot(),
            request_id=request.id,
        )
        await self.notification_service.create_internal(
            event_type="request_created",
            title="Novo pedido recebido",
            message=f"{client.name} enviou uma solicitação para {service.name}.",
            request_id=request.id,
        )
        return request

    async def get_required(self, request_id: int) -> AppointmentRequest:
        request = await self.repository.get(request_id)
        if not request:
            raise NotFoundError("Pedido não encontrado.")
        return request

    async def list_timeline(self, request_id: int):
        await self.get_required(request_id)
        return await self.status_observer.repository.list_by_request(request_id)

    async def list(
        self,
        status: AppointmentStatus | None = None,
        client_name: str | None = None,
        phone: str | None = None,
    ) -> list[AppointmentRequest]:
        normalized_phone = "".join(filter(str.isdigit, phone or "")) or None
        return await self.repository.list(status, client_name, normalized_phone)

    async def list_public_history_by_phone(self, phone: str) -> list[AppointmentRequest]:
        normalized_phone = normalize_phone(phone)
        if len(normalized_phone) < 8:
            return []
        return await self.repository.list_by_client_phone(normalized_phone)

    async def get_public_by_code(self, public_code: str) -> AppointmentRequest:
        request = await self.repository.get_by_public_code(public_code.strip().upper())
        if not request:
            raise NotFoundError("Pedido público não encontrado.")
        return request

    async def generate_unique_public_code(self) -> str:
        for _ in range(8):
            public_code = generate_public_request_code()
            if not await self.repository.get_by_public_code(public_code):
                return public_code
        raise ConflictError("Não foi possível gerar um código público único para o pedido.")

    async def change_status(
        self,
        *,
        request_id: int,
        target_status: AppointmentStatus,
        comment: str | None,
        estimated_price: Decimal | None,
        changed_by: str = "admin",
    ) -> AppointmentRequest:
        request = await self.get_required(request_id)
        before = AppointmentRequestMemento.capture(request)
        previous_status = request.status
        self.status_transitions.validate(previous_status, target_status)
        request.status = target_status
        if comment:
            request.admin_comment = comment
        if estimated_price is not None:
            request.estimated_price = estimated_price
        await self.status_observer.handle(
            StatusChangedEvent(
                request_id=request.id,
                from_status=previous_status,
                to_status=target_status,
                comment=comment,
                changed_by=changed_by,
            )
        )
        await self.audit_service.record(
            entity_type="appointment_request",
            entity_id=request.id,
            action="status_changed",
            changed_by=changed_by,
            before=before.to_audit_snapshot(),
            after=AppointmentRequestMemento.capture(request).to_audit_snapshot(),
            request_id=request.id,
        )
        await self.notification_service.create_internal(
            event_type=f"request_{target_status.value}",
            title="Status do pedido atualizado",
            message=(
                f"Pedido #{request.id} alterado de {previous_status.value} "
                f"para {target_status.value}."
            ),
            request_id=request.id,
        )
        return request

    async def add_admin_comment(self, request_id: int, comment: str) -> AppointmentRequest:
        request = await self.get_required(request_id)
        before = AppointmentRequestMemento.capture(request)
        request.admin_comment = comment
        await self.status_observer.handle(
            StatusChangedEvent(
                request_id=request.id,
                from_status=request.status,
                to_status=request.status,
                comment=comment,
                changed_by="admin",
            )
        )
        await self.audit_service.record(
            entity_type="appointment_request",
            entity_id=request.id,
            action="comment_added",
            changed_by="admin",
            before=before.to_audit_snapshot(),
            after=AppointmentRequestMemento.capture(request).to_audit_snapshot(),
            request_id=request.id,
        )
        await self.notification_service.create_internal(
            event_type="comment_added",
            title="Comentário administrativo registrado",
            message=f"Pedido #{request.id} recebeu um novo comentário do atelier.",
            request_id=request.id,
        )
        return request

    async def update_estimate(
        self,
        request_id: int,
        estimated_price: Decimal,
        comment: str | None,
    ) -> AppointmentRequest:
        request = await self.get_required(request_id)
        before = AppointmentRequestMemento.capture(request)
        request.estimated_price = estimated_price
        if request.status == AppointmentStatus.UNDER_REVIEW:
            request.status = AppointmentStatus.QUOTE_SENT
        if comment:
            request.admin_comment = comment
        await self.status_observer.handle(
            StatusChangedEvent(
                request_id=request.id,
                from_status=before.status,
                to_status=request.status,
                comment=comment or f"Orçamento atualizado para R$ {estimated_price}.",
                changed_by="admin",
            )
        )
        await self.audit_service.record(
            entity_type="appointment_request",
            entity_id=request.id,
            action="estimate_updated",
            changed_by="admin",
            before=before.to_audit_snapshot(),
            after=AppointmentRequestMemento.capture(request).to_audit_snapshot(),
            request_id=request.id,
        )
        await self.notification_service.create_internal(
            event_type="quote_sent",
            title="Orçamento enviado",
            message=f"Pedido #{request.id} recebeu orçamento de R$ {estimated_price}.",
            request_id=request.id,
        )
        return request

    async def reschedule(
        self,
        request_id: int,
        new_slot_id: int,
        comment: str | None,
        changed_by: str = "admin",
    ) -> AppointmentRequest:
        request = await self.get_required(request_id)
        before = AppointmentRequestMemento.capture(request)
        old_slot = request.slot
        if old_slot and old_slot.id == new_slot_id:
            return request
        new_slot = await self.availability_service.reserve_slot(new_slot_id)
        request.slot_id = new_slot.id
        if old_slot:
            old_slot.status = AvailabilityStatus.AVAILABLE
            old_slot.reason = None
        await self.status_observer.handle(
            StatusChangedEvent(
                request_id=request.id,
                from_status=request.status,
                to_status=request.status,
                comment=comment or "Horário remarcado pelo administrativo.",
                changed_by=changed_by,
            )
        )
        await self.audit_service.record(
            entity_type="appointment_request",
            entity_id=request.id,
            action="rescheduled",
            changed_by=changed_by,
            before=before.to_audit_snapshot(),
            after=AppointmentRequestMemento.capture(request).to_audit_snapshot(),
            request_id=request.id,
        )
        await self.notification_service.create_internal(
            event_type="request_rescheduled",
            title="Pedido remarcado",
            message=f"Pedido #{request.id} foi remarcado por {changed_by}.",
            request_id=request.id,
        )
        return request

    async def client_reschedule(
        self,
        request_id: int,
        phone: str,
        new_slot_id: int,
        comment: str | None,
    ) -> AppointmentRequest:
        request = await self.get_required(request_id)
        if normalize_phone(request.client.normalized_phone) != normalize_phone(phone):
            raise ForbiddenError("Telefone não corresponde ao pedido informado.")
        if request.status in {
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED,
            AppointmentStatus.REJECTED,
        }:
            raise ConflictError("Pedido não permite remarcação.")
        return await self.reschedule(
            request_id,
            new_slot_id,
            comment or "Horário remarcado pela cliente.",
            changed_by="client",
        )

    async def add_image(self, request_id: int, image: StoredImage) -> RequestImage:
        request = await self.get_required(request_id)
        request_image = RequestImage(
            request_id=request.id,
            storage_provider=image.provider,
            url=image.url,
            thumbnail_url=image.thumbnail_url,
            public_id=image.public_id,
            original_filename=image.original_filename,
            mime_type=image.mime_type,
            size_bytes=image.size_bytes,
        )
        request.images.append(request_image)
        await self.session.flush()
        return request_image
