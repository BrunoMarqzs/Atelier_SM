from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import UploadFile

from app.models.enums import StorageProvider
from app.strategies.storage import LocalImageStorageStrategy, detect_mime_type
from app.utils.errors import DomainError


def test_detect_mime_type_from_file_signature() -> None:
    assert detect_mime_type(b"\xff\xd8\xff\xe0content") == "image/jpeg"
    assert detect_mime_type(b"\x89PNG\r\n\x1a\ncontent") == "image/png"
    assert detect_mime_type(b"RIFFxxxxWEBPcontent") == "image/webp"
    assert detect_mime_type(b"not-an-image") is None


@pytest.mark.anyio
async def test_local_storage_rejects_invalid_mime_type() -> None:
    file = UploadFile(filename="arquivo.txt", file=BytesIO(b"not-an-image"))

    with pytest.raises(DomainError):
        await LocalImageStorageStrategy().store(file)


@pytest.mark.anyio
async def test_local_storage_rejects_files_above_size_limit(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(
        "app.strategies.storage.get_settings",
        lambda: SimpleNamespace(
            max_upload_size_bytes=4,
            allowed_image_mime_types="image/jpeg,image/png,image/webp",
            local_upload_dir=tmp_path,
            public_upload_base_url="http://localhost/uploads",
            database_upload_storage_enabled=False,
        ),
    )
    file = UploadFile(filename="imagem.jpg", file=BytesIO(b"\xff\xd8\xff\xe0too-large"))

    with pytest.raises(DomainError, match="tamanho máximo"):
        await LocalImageStorageStrategy().store(file)


@pytest.mark.anyio
async def test_local_storage_persists_safe_image_metadata(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(
        "app.strategies.storage.get_settings",
        lambda: SimpleNamespace(
            max_upload_size_bytes=1024,
            allowed_image_mime_types="image/jpeg,image/png,image/webp",
            local_upload_dir=tmp_path,
            public_upload_base_url="http://cdn.local/uploads",
            database_upload_storage_enabled=False,
        ),
    )
    file = UploadFile(filename="../vestido.jpg", file=BytesIO(b"\xff\xd8\xff\xe0content"))

    image = await LocalImageStorageStrategy().store(file)

    assert image.provider == StorageProvider.LOCAL
    assert image.mime_type == "image/jpeg"
    assert image.original_filename == "vestido.jpg"
    assert image.url.startswith("http://cdn.local/uploads/")
    assert image.thumbnail_url == image.url
    assert (tmp_path / image.public_id).exists()


@pytest.mark.anyio
async def test_database_storage_keeps_image_bytes_without_local_file(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(
        "app.strategies.storage.get_settings",
        lambda: SimpleNamespace(
            max_upload_size_bytes=1024,
            allowed_image_mime_types="image/jpeg,image/png,image/webp",
            local_upload_dir=tmp_path,
            public_upload_base_url="http://cdn.local/uploads",
            database_upload_storage_enabled=True,
        ),
    )
    content = b"\xff\xd8\xff\xe0content"
    file = UploadFile(filename="vestido.jpg", file=BytesIO(content))

    image = await LocalImageStorageStrategy().store(file)

    assert image.content_bytes == content
    assert image.url == ""
    assert image.public_id.startswith("database/")
    assert not any(tmp_path.iterdir())
