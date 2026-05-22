from pydantic import BaseModel, Field


class AdminLoginInput(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=180)
    password: str = Field(min_length=8, max_length=128)


class RefreshTokenInput(BaseModel):
    refresh_token: str = Field(min_length=32)


class AuthTokenRead(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AdminSessionRead(BaseModel):
    id: int
    name: str
    email: str
    is_superuser: bool
