from app.models.enums import AppointmentStatus
from app.utils.errors import InvalidStatusTransitionError


class StatusTransitionService:
    allowed_transitions: dict[AppointmentStatus, set[AppointmentStatus]] = {
        AppointmentStatus.PENDING: {
            AppointmentStatus.UNDER_REVIEW,
            AppointmentStatus.APPROVED,
            AppointmentStatus.REJECTED,
            AppointmentStatus.CANCELLED,
        },
        AppointmentStatus.UNDER_REVIEW: {
            AppointmentStatus.QUOTE_SENT,
            AppointmentStatus.APPROVED,
            AppointmentStatus.REJECTED,
            AppointmentStatus.CANCELLED,
        },
        AppointmentStatus.QUOTE_SENT: {
            AppointmentStatus.APPROVED,
            AppointmentStatus.REJECTED,
            AppointmentStatus.CANCELLED,
        },
        AppointmentStatus.APPROVED: {
            AppointmentStatus.IN_PROGRESS,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED,
        },
        AppointmentStatus.IN_PROGRESS: {
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED,
        },
        AppointmentStatus.REJECTED: set(),
        AppointmentStatus.COMPLETED: set(),
        AppointmentStatus.CANCELLED: set(),
    }

    def validate(self, current: AppointmentStatus, target: AppointmentStatus) -> None:
        if current == target:
            return
        if target not in self.allowed_transitions[current]:
            raise InvalidStatusTransitionError(
                f"Transição de status inválida: {current.value} -> {target.value}."
            )
