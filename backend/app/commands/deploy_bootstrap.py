from __future__ import annotations

import argparse
import asyncio
from collections.abc import Sequence

from sqlalchemy import text

from app.commands.seed_database import run_seed
from app.commands.setup_database import run_migrations
from app.config.database import AsyncSessionLocal, connection_settings, engine
from app.config.settings import Settings, get_settings

DEFAULT_JWT_SECRET = "change-me-in-production"
DEFAULT_SEED_PASSWORD = "change-me-admin-password"


def redact_database_url(url: str) -> str:
    if "@" not in url or "://" not in url:
        return url

    scheme, rest = url.split("://", 1)
    credentials, host = rest.split("@", 1)
    if ":" not in credentials:
        return f"{scheme}://***@{host}"

    user, _password = credentials.split(":", 1)
    return f"{scheme}://{user}:***@{host}"


def validate_bootstrap_settings(settings: Settings) -> list[str]:
    errors: list[str] = []

    if not settings.resolved_database_url.strip():
        errors.append("DATABASE_URL/PRODUCTION_DATABASE_URL não foi definida.")

    if settings.app_env == "production":
        if settings.jwt_secret_key == DEFAULT_JWT_SECRET or len(settings.jwt_secret_key) < 32:
            errors.append("JWT_SECRET_KEY de produção precisa ser forte e diferente do padrão.")
        if settings.seed_admin_password == DEFAULT_SEED_PASSWORD:
            errors.append("SEED_ADMIN_PASSWORD de produção não pode usar a senha padrão.")
        if not settings.public_web_base_url.startswith("https://"):
            errors.append("PUBLIC_WEB_BASE_URL de produção deve usar HTTPS.")

    return errors


async def wait_for_database(attempts: int, delay_seconds: float) -> None:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(text("SELECT 1"))
            print(f"Bootstrap: banco respondeu na tentativa {attempt}/{attempts}.")
            return
        except Exception as exc:  # noqa: BLE001 - operational command should report any DB failure
            last_error = exc
            print(f"Bootstrap: banco indisponível na tentativa {attempt}/{attempts}: {exc}")
            if attempt < attempts:
                await asyncio.sleep(delay_seconds)

    raise RuntimeError("Não foi possível conectar ao banco de dados.") from last_error


async def close_database_connections() -> None:
    await engine.dispose(close=False)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Prepara o backend para produção: valida ambiente, testa banco, "
            "roda migrations e seed."
        )
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Valida ambiente e conexão sem migrar ou semear.",
    )
    parser.add_argument(
        "--migrate-only",
        action="store_true",
        help="Roda apenas migrations após validar conexão.",
    )
    parser.add_argument(
        "--seed-only",
        action="store_true",
        help="Roda apenas seed após validar conexão.",
    )
    parser.add_argument(
        "--skip-seed",
        action="store_true",
        help="Roda migrations, mas não executa seed.",
    )
    parser.add_argument(
        "--attempts",
        type=int,
        default=6,
        help="Tentativas de conexão com o banco.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=5.0,
        help="Espera em segundos entre tentativas.",
    )
    return parser


def run_bootstrap(args: argparse.Namespace) -> None:
    settings = get_settings()
    errors = validate_bootstrap_settings(settings)

    if args.migrate_only and args.seed_only:
        raise SystemExit("Use apenas um entre --migrate-only e --seed-only.")

    if errors:
        print("Bootstrap: configuração inválida.")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(2)

    print(f"Bootstrap: ambiente={settings.app_env}")
    print(f"Bootstrap: banco={redact_database_url(connection_settings.url)}")
    asyncio.run(wait_for_database(args.attempts, args.delay))
    asyncio.run(close_database_connections())

    if args.check_only:
        print("Bootstrap: validação concluída. Nenhuma migration ou seed executada.")
        return

    if not args.seed_only:
        print("Bootstrap: aplicando migrations...")
        run_migrations()
        print("Bootstrap: migrations concluídas.")
        asyncio.run(close_database_connections())

    if not args.migrate_only and not args.skip_seed:
        print("Bootstrap: sincronizando dados iniciais...")
        asyncio.run(run_seed())
        asyncio.run(close_database_connections())
        print("Bootstrap: seed concluído.")

    print("Bootstrap: produção preparada com sucesso.")


def main(argv: Sequence[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    run_bootstrap(args)


if __name__ == "__main__":
    main()
