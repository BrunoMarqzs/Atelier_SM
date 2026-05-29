from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.config.settings import get_settings
from app.models.enums import StorageProvider
from app.utils.errors import DomainError

MIME_SIGNATURES = {
    "image/jpeg": (b"\xff\xd8\xff", ".jpg"),
    "image/png": (b"\x89PNG\r\n\x1a\n", ".png"),
    "image/webp": (b"RIFF", ".webp"),
}


@dataclass(frozen=True)
class StoredImage:
    provider: StorageProvider
    url: str
    thumbnail_url: str | None
    public_id: str | None
    original_filename: str | None
    mime_type: str
    size_bytes: int
    content_bytes: bytes | None = None


def detect_mime_type(content: bytes) -> str | None:
    for mime_type, (signature, _) in MIME_SIGNATURES.items():
        if content.startswith(signature):
            if mime_type == "image/webp" and content[8:12] != b"WEBP":
                return None
            return mime_type
    return None


def safe_original_filename(filename: str | None) -> str | None:
    if not filename:
        return None
    return Path(filename).name[:240]


class LocalImageStorageStrategy:
    async def store(self, file: UploadFile) -> StoredImage:
        settings = get_settings()
        content = await file.read(settings.max_upload_size_bytes + 1)
        if len(content) > settings.max_upload_size_bytes:
            raise DomainError("Imagem acima do tamanho máximo permitido.")

        mime_type = detect_mime_type(content)
        allowed = {item.strip() for item in settings.allowed_image_mime_types.split(",")}
        if not mime_type or mime_type not in allowed:
            raise DomainError("Formato de imagem não permitido.")

        _, extension = MIME_SIGNATURES[mime_type]
        if settings.database_upload_storage_enabled:
            public_id = f"database/{uuid4().hex}{extension}"
            return StoredImage(
                provider=StorageProvider.LOCAL,
                url="",
                thumbnail_url=None,
                public_id=public_id,
                original_filename=safe_original_filename(file.filename),
                mime_type=mime_type,
                size_bytes=len(content),
                content_bytes=content,
            )

        upload_month = datetime.now(UTC).strftime("%Y/%m")
        upload_dir = settings.local_upload_dir / upload_month
        upload_dir.mkdir(parents=True, exist_ok=True)

        public_id = f"{upload_month}/{uuid4().hex}{extension}"
        target = settings.local_upload_dir / public_id
        target.write_bytes(content)

        public_path = public_id.replace("\\", "/")
        url = f"{settings.public_upload_base_url.rstrip('/')}/{public_path}"
        return StoredImage(
            provider=StorageProvider.LOCAL,
            url=url,
            thumbnail_url=url,
            public_id=public_id,
            original_filename=safe_original_filename(file.filename),
            mime_type=mime_type,
            size_bytes=len(content),
        )


def get_storage_strategy() -> LocalImageStorageStrategy:
    settings = get_settings()
    if settings.upload_provider != StorageProvider.LOCAL:
        raise DomainError("Provider de upload ainda não configurado neste ambiente.")
    return LocalImageStorageStrategy()
