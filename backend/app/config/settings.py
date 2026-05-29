from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Atelier Sibele Marques API"
    app_env: Literal["development", "staging", "production"] = "development"
    api_prefix: str = "/api"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/atelier_sibele"
    staging_database_url: str | None = None
    production_database_url: str | None = None
    jwt_secret_key: str = Field(default="change-me-in-production", min_length=16)
    access_token_expire_minutes: int = Field(default=30, ge=5, le=240)
    refresh_token_expire_days: int = Field(default=14, ge=1, le=60)
    auth_rate_limit_attempts: int = Field(default=5, ge=3, le=20)
    auth_rate_limit_window_seconds: int = Field(default=300, ge=60, le=3600)
    seed_admin_name: str = "Sibele Marques"
    seed_admin_email: str = "admin@ateliersibele.local"
    seed_admin_password: str = Field(default="change-me-admin-password", min_length=8)
    upload_provider: str = "local"
    local_upload_dir: Path = Path("storage/uploads")
    public_upload_base_url: str = "http://localhost:8000/uploads"
    database_upload_storage_enabled: bool = True
    public_web_base_url: str = "http://localhost:8084"
    max_upload_size_bytes: int = Field(default=8 * 1024 * 1024, ge=1024 * 1024)
    allowed_image_mime_types: str = "image/jpeg,image/png,image/webp"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def resolved_database_url(self) -> str:
        if self.app_env == "production" and self.production_database_url:
            return self.production_database_url
        if self.app_env == "staging" and self.staging_database_url:
            return self.staging_database_url
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
