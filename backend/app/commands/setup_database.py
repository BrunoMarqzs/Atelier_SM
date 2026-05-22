import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.commands.seed_database import run_seed


def run_migrations() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    alembic_config = Config(str(backend_root / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(backend_root / "migrations"))
    command.upgrade(alembic_config, "head")


def main() -> None:
    run_migrations()
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
