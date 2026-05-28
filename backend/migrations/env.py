from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from app.config.database import Base
from app.config.database_url import build_asyncpg_connection_settings
from app.config.settings import get_settings
from app.models import (  # noqa: F401
    AdminUser,
    AppointmentRequest,
    AuditLog,
    AvailabilitySlot,
    ClientProfile,
    Notification,
    RefreshToken,
    RequestImage,
    ScheduleConfig,
    ScheduleException,
    Service,
    StatusHistory,
)

config = context.config
settings = get_settings()
connection_settings = build_asyncpg_connection_settings(settings.resolved_database_url)
config.set_main_option("sqlalchemy.url", connection_settings.url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(
        connection_settings.url,
        poolclass=pool.NullPool,
        connect_args=connection_settings.connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_offline() -> None:
    context.configure(
        url=connection_settings.url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    import asyncio

    asyncio.run(run_async_migrations())
