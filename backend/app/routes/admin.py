# ruff: noqa: B008

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.commands.availability_commands import BlockSlotCommand
from app.commands.request_commands import ChangeRequestStatusCommand
from app.config.database import get_session
from app.models.admin_user import AdminUser
from app.models.enums import AppointmentStatus
from app.services.announcement_service import AnnouncementService
from app.services.audit_service import AuditService
from app.services.availability_service import AvailabilityService
from app.services.notification_service import NotificationService
from app.services.request_service import AppointmentRequestService
from app.services.schedule_policy_service import SchedulePolicyService
from app.services.service_service import ServiceService
from app.utils.security import require_admin_user
from app.validators.announcement import AnnouncementCreate, AnnouncementRead, AnnouncementUpdate
from app.validators.audit import AuditLogRead
from app.validators.availability import (
    AvailabilitySlotCreate,
    AvailabilitySlotRead,
    BlockSlotInput,
    ReleaseSlotInput,
)
from app.validators.common import MessageResponse
from app.validators.notification import NotificationRead
from app.validators.request import (
    AdminCommentInput,
    AppointmentEstimateInput,
    AppointmentRequestRead,
    AppointmentRescheduleInput,
    AppointmentStatusChangeInput,
    StatusHistoryRead,
)
from app.validators.schedule import (
    ScheduleConfigRead,
    ScheduleConfigUpdate,
    ScheduleExceptionCreate,
    ScheduleExceptionRead,
)
from app.validators.service import ServiceCreate, ServiceRead, ServiceUpdate

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin_user)],
)


@router.get("/dashboard")
async def dashboard(session: AsyncSession = Depends(get_session)) -> dict[str, int]:
    requests = await AppointmentRequestService(session).list_requests()
    return {
        "total_requests": len(requests),
        "pending_requests": len(
            [item for item in requests if item.status == AppointmentStatus.PENDING]
        ),
        "under_review_requests": len(
            [item for item in requests if item.status == AppointmentStatus.UNDER_REVIEW]
        ),
        "approved_requests": len(
            [item for item in requests if item.status == AppointmentStatus.APPROVED]
        ),
    }


@router.get("/announcements", response_model=list[AnnouncementRead])
async def list_admin_announcements(
    session: AsyncSession = Depends(get_session),
) -> list[AnnouncementRead]:
    return await AnnouncementService(session).list_admin()


@router.post("/announcements", response_model=AnnouncementRead, status_code=201)
async def create_announcement(
    payload: AnnouncementCreate,
    session: AsyncSession = Depends(get_session),
) -> AnnouncementRead:
    announcement = await AnnouncementService(session).create(payload)
    await session.commit()
    await session.refresh(announcement)
    return announcement


@router.patch("/announcements/{announcement_id}", response_model=AnnouncementRead)
async def update_announcement(
    announcement_id: int,
    payload: AnnouncementUpdate,
    session: AsyncSession = Depends(get_session),
) -> AnnouncementRead:
    announcement = await AnnouncementService(session).update(announcement_id, payload)
    await session.commit()
    await session.refresh(announcement)
    return announcement


@router.delete("/announcements/{announcement_id}", response_model=MessageResponse)
async def deactivate_announcement(
    announcement_id: int,
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await AnnouncementService(session).deactivate(announcement_id)
    await session.commit()
    return MessageResponse(message="Anúncio desativado com sucesso.")


@router.get("/requests", response_model=list[AppointmentRequestRead])
async def list_requests(
    status: AppointmentStatus | None = Query(default=None),
    client_name: str | None = Query(default=None, max_length=120),
    phone: str | None = Query(default=None, max_length=32),
    session: AsyncSession = Depends(get_session),
) -> list[AppointmentRequestRead]:
    return await AppointmentRequestService(session).list_requests(status, client_name, phone)


@router.get("/requests/{request_id}", response_model=AppointmentRequestRead)
async def get_request(
    request_id: int,
    session: AsyncSession = Depends(get_session),
) -> AppointmentRequestRead:
    return await AppointmentRequestService(session).get_required(request_id)


@router.get("/requests/{request_id}/timeline", response_model=list[StatusHistoryRead])
async def get_request_timeline(
    request_id: int,
    session: AsyncSession = Depends(get_session),
) -> list[StatusHistoryRead]:
    return await AppointmentRequestService(session).list_timeline(request_id)


@router.get("/audit", response_model=list[AuditLogRead])
async def list_audit_logs(
    request_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=300),
    session: AsyncSession = Depends(get_session),
) -> list[AuditLogRead]:
    return await AuditService(session).list(request_id=request_id, limit=limit)


@router.get("/notifications", response_model=list[NotificationRead])
async def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=80, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
) -> list[NotificationRead]:
    return await NotificationService(session).list(unread_only=unread_only, limit=limit)


@router.post("/notifications/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_read(
    notification_id: int,
    session: AsyncSession = Depends(get_session),
) -> NotificationRead:
    notification = await NotificationService(session).mark_read(notification_id)
    await session.commit()
    await session.refresh(notification)
    return notification


@router.get("/schedule/config", response_model=ScheduleConfigRead)
async def get_schedule_config(
    session: AsyncSession = Depends(get_session),
) -> ScheduleConfigRead:
    return await SchedulePolicyService(session).get_config()


@router.patch("/schedule/config", response_model=ScheduleConfigRead)
async def update_schedule_config(
    payload: ScheduleConfigUpdate,
    session: AsyncSession = Depends(get_session),
) -> ScheduleConfigRead:
    config = await SchedulePolicyService(session).update_config(payload)
    await session.commit()
    await session.refresh(config)
    return config


@router.get("/schedule/exceptions", response_model=list[ScheduleExceptionRead])
async def list_schedule_exceptions(
    session: AsyncSession = Depends(get_session),
) -> list[ScheduleExceptionRead]:
    return await SchedulePolicyService(session).list_exceptions()


@router.get("/availability", response_model=list[AvailabilitySlotRead])
async def list_admin_availability(
    starts_at: datetime = Query(...),
    ends_at: datetime = Query(...),
    session: AsyncSession = Depends(get_session),
) -> list[AvailabilitySlotRead]:
    slots = await AvailabilityService(session).list_for_admin(starts_at, ends_at)
    await session.commit()
    return slots


@router.post("/schedule/exceptions", response_model=ScheduleExceptionRead, status_code=201)
async def upsert_schedule_exception(
    payload: ScheduleExceptionCreate,
    session: AsyncSession = Depends(get_session),
    admin_user: AdminUser = Depends(require_admin_user),
) -> ScheduleExceptionRead:
    policy = SchedulePolicyService(session)
    existing = await policy.get_exception_by_date(payload.exception_date)
    before = _schedule_exception_snapshot(existing)
    exception = await policy.upsert_exception(payload)
    await AuditService(session).record(
        entity_type="schedule_exception",
        entity_id=exception.id,
        action="schedule_day_closed" if payload.kind == "closed" else "schedule_exception_saved",
        changed_by=admin_user.email,
        before=before,
        after=_schedule_exception_snapshot(exception),
    )
    await session.commit()
    await session.refresh(exception)
    return exception


@router.delete("/schedule/exceptions/{exception_id}", response_model=MessageResponse)
async def delete_schedule_exception(
    exception_id: int,
    session: AsyncSession = Depends(get_session),
    admin_user: AdminUser = Depends(require_admin_user),
) -> MessageResponse:
    exception = await SchedulePolicyService(session).delete_exception(exception_id)
    await AuditService(session).record(
        entity_type="schedule_exception",
        entity_id=exception.id,
        action="schedule_exception_removed",
        changed_by=admin_user.email,
        before=_schedule_exception_snapshot(exception),
        after=None,
    )
    await session.commit()
    return MessageResponse(message="Exceção de agenda removida com sucesso.")


def _schedule_exception_snapshot(exception) -> dict | None:
    if exception is None:
        return None
    return {
        "exception_date": str(exception.exception_date),
        "kind": exception.kind,
        "hours": exception.hours,
        "reason": exception.reason,
    }


@router.patch("/requests/{request_id}/status", response_model=AppointmentRequestRead)
async def change_request_status(
    request_id: int,
    payload: AppointmentStatusChangeInput,
    session: AsyncSession = Depends(get_session),
) -> AppointmentRequestRead:
    await ChangeRequestStatusCommand(session).execute(
        request_id=request_id,
        status=payload.status,
        comment=payload.comment,
        estimated_price=payload.estimated_price,
    )
    await session.commit()
    return await AppointmentRequestService(session).get_required(request_id)


@router.post("/requests/{request_id}/comments", response_model=AppointmentRequestRead)
async def add_comment(
    request_id: int,
    payload: AdminCommentInput,
    session: AsyncSession = Depends(get_session),
) -> AppointmentRequestRead:
    await AppointmentRequestService(session).add_admin_comment(request_id, payload.comment)
    await session.commit()
    return await AppointmentRequestService(session).get_required(request_id)


@router.patch("/requests/{request_id}/estimate", response_model=AppointmentRequestRead)
async def update_estimate(
    request_id: int,
    payload: AppointmentEstimateInput,
    session: AsyncSession = Depends(get_session),
) -> AppointmentRequestRead:
    await AppointmentRequestService(session).update_estimate(
        request_id,
        payload.estimated_price,
        payload.comment,
    )
    await session.commit()
    return await AppointmentRequestService(session).get_required(request_id)


@router.patch("/requests/{request_id}/reschedule", response_model=AppointmentRequestRead)
async def reschedule_request(
    request_id: int,
    payload: AppointmentRescheduleInput,
    session: AsyncSession = Depends(get_session),
) -> AppointmentRequestRead:
    await AppointmentRequestService(session).reschedule(
        request_id,
        payload.slot_id,
        payload.comment,
    )
    await session.commit()
    return await AppointmentRequestService(session).get_required(request_id)


@router.get("/services", response_model=list[ServiceRead])
async def list_admin_services(session: AsyncSession = Depends(get_session)) -> list[ServiceRead]:
    return await ServiceService(session).list_all()


@router.post("/services", response_model=ServiceRead, status_code=201)
async def create_service(
    payload: ServiceCreate,
    session: AsyncSession = Depends(get_session),
) -> ServiceRead:
    service = await ServiceService(session).create(payload)
    await session.commit()
    await session.refresh(service)
    return service


@router.patch("/services/{service_id}", response_model=ServiceRead)
async def update_service(
    service_id: int,
    payload: ServiceUpdate,
    session: AsyncSession = Depends(get_session),
) -> ServiceRead:
    service = await ServiceService(session).update(service_id, payload)
    await session.commit()
    await session.refresh(service)
    return service


@router.delete("/services/{service_id}", response_model=MessageResponse)
async def deactivate_service(
    service_id: int,
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await ServiceService(session).deactivate(service_id)
    await session.commit()
    return MessageResponse(message="Serviço desativado com sucesso.")


@router.post("/availability", response_model=AvailabilitySlotRead, status_code=201)
async def create_availability_slot(
    payload: AvailabilitySlotCreate,
    session: AsyncSession = Depends(get_session),
) -> AvailabilitySlotRead:
    slot = await AvailabilityService(session).create_slot(payload)
    await session.commit()
    await session.refresh(slot)
    return slot


@router.post("/availability/block", response_model=AvailabilitySlotRead)
async def block_availability_slot(
    payload: BlockSlotInput,
    session: AsyncSession = Depends(get_session),
) -> AvailabilitySlotRead:
    slot = await BlockSlotCommand(session).execute(payload)
    await session.commit()
    await session.refresh(slot)
    return slot


@router.post("/availability/release", response_model=AvailabilitySlotRead)
async def release_availability_slot_window(
    payload: ReleaseSlotInput,
    session: AsyncSession = Depends(get_session),
) -> AvailabilitySlotRead:
    slot = await AvailabilityService(session).release_slot_window(payload)
    await session.commit()
    await session.refresh(slot)
    return slot


@router.post("/availability/{slot_id}/release", response_model=AvailabilitySlotRead)
async def release_availability_slot(
    slot_id: int,
    session: AsyncSession = Depends(get_session),
) -> AvailabilitySlotRead:
    slot = await AvailabilityService(session).release_slot(slot_id)
    await session.commit()
    await session.refresh(slot)
    return slot
