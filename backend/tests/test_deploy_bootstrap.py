from app.commands.deploy_bootstrap import redact_database_url, validate_bootstrap_settings
from app.config.settings import Settings


def make_settings(**overrides: object) -> Settings:
    data = {
        "app_env": "production",
        "database_url": "postgresql+asyncpg://postgres:secret@db.project.supabase.co:5432/postgres",
        "jwt_secret_key": "production-secret-with-more-than-32-characters",
        "seed_admin_password": "safe-production-password",
        "public_web_base_url": "https://atelier-sm.vercel.app",
    }
    data.update(overrides)
    return Settings(**data)


def test_redacts_database_url_password() -> None:
    redacted = redact_database_url(
        "postgresql+asyncpg://postgres:super-secret@db.project.supabase.co:5432/postgres"
    )

    assert redacted == "postgresql+asyncpg://postgres:***@db.project.supabase.co:5432/postgres"
    assert "super-secret" not in redacted


def test_accepts_valid_production_bootstrap_settings() -> None:
    assert validate_bootstrap_settings(make_settings()) == []


def test_rejects_unsafe_production_bootstrap_settings() -> None:
    errors = validate_bootstrap_settings(
        make_settings(
            jwt_secret_key="change-me-in-production",
            seed_admin_password="change-me-admin-password",
            public_web_base_url="http://atelier-sm.vercel.app",
        )
    )

    assert "JWT_SECRET_KEY de produção precisa ser forte e diferente do padrão." in errors
    assert "SEED_ADMIN_PASSWORD de produção não pode usar a senha padrão." in errors
    assert "PUBLIC_WEB_BASE_URL de produção deve usar HTTPS." in errors
