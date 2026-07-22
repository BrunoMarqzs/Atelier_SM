from datetime import datetime, timedelta

import pytest
from pydantic import ValidationError

from app.validators.announcement import AnnouncementCreate


def test_announcement_rejects_invalid_date_window() -> None:
    starts_at = datetime.now()

    with pytest.raises(ValidationError):
        AnnouncementCreate(
            title="Agenda de festa",
            body="Antecipe ajustes importantes para eventos e vestidos especiais.",
            starts_at=starts_at,
            ends_at=starts_at - timedelta(days=1),
        )


def test_external_url_action_requires_url() -> None:
    with pytest.raises(ValidationError):
        AnnouncementCreate(
            title="Campanha externa",
            body="Acesse uma página externa com informações sobre a campanha.",
            cta_label="Ver detalhes",
            cta_action="external_url",
        )


def test_action_requires_button_label() -> None:
    with pytest.raises(ValidationError):
        AnnouncementCreate(
            title="Agenda aberta",
            body="Horários especiais disponíveis para ajustes de peças de festa.",
            cta_action="create_order",
        )


def test_accepts_valid_home_announcement() -> None:
    announcement = AnnouncementCreate(
        title="Agenda aberta para peças especiais",
        body="Antecipe ajustes de vestidos de festa com atendimento cuidadoso.",
        kind="schedule",
        cta_label="Agendar atendimento",
        cta_action="create_order",
        priority=20,
    )

    assert announcement.kind == "schedule"
    assert announcement.cta_action == "create_order"
