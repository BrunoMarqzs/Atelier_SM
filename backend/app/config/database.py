from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config.database_url import build_asyncpg_connection_settings
from app.config.settings import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
connection_settings = build_asyncpg_connection_settings(settings.resolved_database_url)
engine = create_async_engine(
    connection_settings.url,
    echo=False,
    pool_pre_ping=True,
    connect_args=connection_settings.connect_args,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
