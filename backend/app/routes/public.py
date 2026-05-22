# ruff: noqa: B008

from datetime import datetime

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_session
from app.services.availability_service import AvailabilityService
from app.services.booking_facade import BookingFacade
from app.services.request_service import AppointmentRequestService
from app.services.service_service import ServiceService
from app.strategies.storage import get_storage_strategy
from app.validators.availability import AvailabilitySlotRead
from app.validators.request import (
    AppointmentRequestCreate,
    AppointmentRequestRead,
    ClientAppointmentRescheduleInput,
    RequestImageRead,
)
from app.validators.service import ServiceRead

router = APIRouter(tags=["Public"])


@router.get("/services", response_model=list[ServiceRead])
async def list_services(session: AsyncSession = Depends(get_session)) -> list[ServiceRead]:
    return await ServiceService(session).list_active()


@router.get("/services/highlighted", response_model=list[ServiceRead])
async def list_highlighted_services(
    session: AsyncSession = Depends(get_session),
) -> list[ServiceRead]:
    return await ServiceService(session).list_highlighted()


@router.get("/availability", response_model=list[AvailabilitySlotRead])
async def list_availability(
    starts_at: datetime = Query(...),
    ends_at: datetime = Query(...),
    session: AsyncSession = Depends(get_session),
) -> list[AvailabilitySlotRead]:
    slots = await AvailabilityService(session).list_available(starts_at, ends_at)
    await session.commit()
    return slots


@router.post("/requests", response_model=AppointmentRequestRead, status_code=201)
async def create_request(
    payload: AppointmentRequestCreate,
    session: AsyncSession = Depends(get_session),
) -> AppointmentRequestRead:
    request = await BookingFacade(session).request_appointment(payload)
    request_id = request.id
    await session.commit()
    return await AppointmentRequestService(session).get_required(request_id)


@router.get("/requests/history", response_model=list[AppointmentRequestRead])
async def list_request_history(
    phone: str = Query(..., min_length=8, max_length=32),
    session: AsyncSession = Depends(get_session),
) -> list[AppointmentRequestRead]:
    return await AppointmentRequestService(session).list_public_history_by_phone(phone)


@router.get("/requests/public/{public_code}", response_model=AppointmentRequestRead)
async def get_public_request(
    public_code: str,
    session: AsyncSession = Depends(get_session),
) -> AppointmentRequestRead:
    return await AppointmentRequestService(session).get_public_by_code(public_code)


@router.post("/requests/{request_id}/images", response_model=RequestImageRead, status_code=201)
async def upload_request_image(
    request_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> RequestImageRead:
    stored_image = await get_storage_strategy().store(file)
    request_image = await AppointmentRequestService(session).add_image(request_id, stored_image)
    await session.commit()
    await session.refresh(request_image)
    return request_image


@router.patch("/requests/{request_id}/reschedule", response_model=AppointmentRequestRead)
async def reschedule_request_by_client(
    request_id: int,
    payload: ClientAppointmentRescheduleInput,
    session: AsyncSession = Depends(get_session),
) -> AppointmentRequestRead:
    request = await AppointmentRequestService(session).client_reschedule(
        request_id=request_id,
        phone=payload.phone,
        new_slot_id=payload.slot_id,
        comment=payload.comment,
    )
    await session.commit()
    return await AppointmentRequestService(session).get_required(request.id)
