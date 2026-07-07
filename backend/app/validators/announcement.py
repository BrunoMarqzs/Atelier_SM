from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.validators.common import ORMModel

AnnouncementKind = Literal["promotion", "notice", "news", "schedule"]
AnnouncementAction = Literal["none", "create_order", "client_history", "external_url"]


class AnnouncementBase(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    body: str = Field(min_length=10, max_length=1200)
    kind: AnnouncementKind = "news"
    cta_label: str | None = Field(default=None, max_length=80)
    cta_action: AnnouncementAction = "none"
    cta_url: str | None = Field(default=None, max_length=500)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    priority: int = Field(default=0, ge=0, le=100)
    is_active: bool = True

    @model_validator(mode="after")
    def validate_announcement(self) -> "AnnouncementBase":
        if self.ends_at and self.starts_at and self.ends_at <= self.starts_at:
            raise ValueError("A data final precisa ser posterior à data inicial.")
        if self.cta_action == "external_url" and not self.cta_url:
            raise ValueError("Anúncios com link externo exigem cta_url.")
        if self.cta_action != "external_url" and self.cta_url:
            raise ValueError("cta_url só deve ser usado com ação external_url.")
        if self.cta_action != "none" and not self.cta_label:
            raise ValueError("Anúncios com ação exigem texto do botão.")
        return self


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=140)
    body: str | None = Field(default=None, min_length=10, max_length=1200)
    kind: AnnouncementKind | None = None
    cta_label: str | None = Field(default=None, max_length=80)
    cta_action: AnnouncementAction | None = None
    cta_url: str | None = Field(default=None, max_length=500)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    priority: int | None = Field(default=None, ge=0, le=100)
    is_active: bool | None = None


class AnnouncementRead(ORMModel):
    id: int
    title: str
    body: str
    kind: str
    cta_label: str | None
    cta_action: str
    cta_url: str | None
    starts_at: datetime | None
    ends_at: datetime | None
    priority: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
