import re

from pydantic import BaseModel, Field, field_validator

from app.validators.common import ORMModel


def normalize_phone(phone: str) -> str:
    return re.sub(r"\D", "", phone)


class ClientIdentityInput(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=32)

    @field_validator("phone")
    @classmethod
    def phone_must_have_digits(cls, value: str) -> str:
        if len(normalize_phone(value)) < 8:
            raise ValueError("Telefone deve conter ao menos 8 digitos.")
        return value


class ClientProfileRead(ORMModel):
    id: int
    name: str
    phone: str
