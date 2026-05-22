import pytest

from app.models.enums import AppointmentStatus
from app.services.status_transition_service import StatusTransitionService
from app.utils.errors import InvalidStatusTransitionError


def test_allows_valid_request_lifecycle_transition() -> None:
    service = StatusTransitionService()

    service.validate(AppointmentStatus.PENDING, AppointmentStatus.UNDER_REVIEW)
    service.validate(AppointmentStatus.UNDER_REVIEW, AppointmentStatus.QUOTE_SENT)
    service.validate(AppointmentStatus.QUOTE_SENT, AppointmentStatus.APPROVED)
    service.validate(AppointmentStatus.APPROVED, AppointmentStatus.IN_PROGRESS)
    service.validate(AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED)


def test_allows_approved_request_to_be_completed_from_admin_panel() -> None:
    service = StatusTransitionService()

    service.validate(AppointmentStatus.APPROVED, AppointmentStatus.COMPLETED)


def test_blocks_transition_from_completed_to_in_progress() -> None:
    service = StatusTransitionService()

    with pytest.raises(InvalidStatusTransitionError):
        service.validate(AppointmentStatus.COMPLETED, AppointmentStatus.IN_PROGRESS)
