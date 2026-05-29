import pytest

from app.config.database_url import build_asyncpg_connection_settings


def test_accepts_supabase_direct_url_with_sslmode() -> None:
    settings = build_asyncpg_connection_settings(
        "postgresql://postgres:secret@db.project.supabase.co:5432/postgres?sslmode=require"
    )

    assert (
        settings.url == "postgresql+asyncpg://postgres:secret@db.project.supabase.co:5432/postgres"
    )
    assert "ssl" in settings.connect_args


def test_keeps_asyncpg_url_and_pooler_cache_option() -> None:
    settings = build_asyncpg_connection_settings(
        "postgresql+asyncpg://postgres.project:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
        "?prepared_statement_cache_size=0&sslmode=require"
    )

    assert settings.url.endswith("/postgres?prepared_statement_cache_size=0")
    assert "ssl" in settings.connect_args
    assert settings.connect_args["statement_cache_size"] == 0
    assert callable(settings.connect_args["prepared_statement_name_func"])


def test_accepts_legacy_postgres_scheme() -> None:
    settings = build_asyncpg_connection_settings(
        "postgres://postgres:secret@localhost:5432/atelier_sibele"
    )

    assert settings.url == "postgresql+asyncpg://postgres:secret@localhost:5432/atelier_sibele"
    assert settings.connect_args == {}


def test_forces_ssl_for_supabase_host() -> None:
    settings = build_asyncpg_connection_settings(
        "postgresql+asyncpg://postgres:secret@db.project.supabase.co:5432/postgres"
    )

    assert "ssl" in settings.connect_args


def test_rejects_url_without_host() -> None:
    with pytest.raises(ValueError, match="exatamente duas barras"):
        build_asyncpg_connection_settings(
            "postgresql+asyncpg:///postgres:secret@db.project.supabase.co:5432/postgres"
        )
