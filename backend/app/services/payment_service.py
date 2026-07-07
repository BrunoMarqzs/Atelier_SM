from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import PaymentMethod, PaymentProvider, PaymentStatus
from app.models.payment import Payment
from app.repositories.payment_repository import PaymentRepository
from app.repositories.request_repository import AppointmentRequestRepository
from app.utils.errors import ConflictError, NotFoundError
from app.validators.payment import MockPaymentCreate, PaymentStatusUpdate

PAYMENT_EXPIRATION_MINUTES = 10


class PaymentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = PaymentRepository(session)
        self.request_repository = AppointmentRequestRepository(session)

    async def create_mock_for_order(self, order_id: int, payload: MockPaymentCreate) -> Payment:
        order = await self.request_repository.get(order_id)
        if not order:
            raise NotFoundError("Pedido nÃ£o encontrado para criaÃ§Ã£o do pagamento.")
        existing_payment = await self.repository.get_by_order_id(order_id)
        if existing_payment:
            raise ConflictError("Este pedido jÃ¡ possui um pagamento vinculado.")

        expires_at = payload.expires_at or datetime.now(UTC) + timedelta(
            minutes=PAYMENT_EXPIRATION_MINUTES
        )
        return await self.repository.add(
            Payment(
                order_id=order_id,
                provider=PaymentProvider.MOCK,
                method=PaymentMethod.PIX,
                status=PaymentStatus.WAITING_PAYMENT,
                amount=payload.amount,
                pix_qr_code=payload.pix_qr_code,
                pix_copy_paste=payload.pix_copy_paste
                or f"PIX-MOCK-ATELIER-SIBELE-PEDIDO-{order_id}-VALOR-{payload.amount}",
                external_payment_id=payload.external_payment_id,
                expires_at=expires_at,
            )
        )

    async def get_by_order_id(self, order_id: int) -> Payment:
        payment = await self.repository.get_by_order_id(order_id)
        if not payment:
            raise NotFoundError("Pagamento nÃ£o encontrado para este pedido.")
        await self.expire_if_needed(payment)
        return payment

    async def get_by_public_code(self, public_code: str) -> Payment:
        order = await self.request_repository.get_by_public_code(public_code.strip().upper())
        if not order:
            raise NotFoundError("Pedido pÃºblico nÃ£o encontrado.")
        return await self.get_by_order_id(order.id)

    async def update_status(self, payment_id: int, payload: PaymentStatusUpdate) -> Payment:
        payment = await self.repository.get(payment_id)
        if not payment:
            raise NotFoundError("Pagamento nÃ£o encontrado.")
        await self.expire_if_needed(payment)

        if payment.status == PaymentStatus.PAID and payload.status != PaymentStatus.PAID:
            raise ConflictError("Pagamento confirmado nÃ£o pode ser reaberto.")
        if payment.status == PaymentStatus.EXPIRED and payload.status == PaymentStatus.PAID:
            raise ConflictError("Pagamento expirado nÃ£o pode ser confirmado.")

        payment.status = payload.status
        if payload.status == PaymentStatus.PAID and payment.paid_at is None:
            payment.paid_at = datetime.now(UTC)
        if payload.status != PaymentStatus.PAID:
            payment.paid_at = payload.paid_at
        elif payload.paid_at is not None:
            payment.paid_at = payload.paid_at
        await self.session.flush()
        return payment

    async def expire_if_needed(self, payment: Payment) -> None:
        if payment.status not in {PaymentStatus.PENDING, PaymentStatus.WAITING_PAYMENT}:
            return
        if payment.expires_at is None:
            return

        expires_at = payment.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if datetime.now(UTC) <= expires_at:
            return

        payment.status = PaymentStatus.EXPIRED
        await self.session.flush()
