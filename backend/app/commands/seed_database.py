from datetime import datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import AsyncSessionLocal
from app.config.settings import get_settings
from app.models.admin_user import AdminUser
from app.models.availability_slot import AvailabilitySlot
from app.models.enums import AvailabilityStatus, PriceType
from app.utils.schedule_rules import allowed_hours_for_date
from app.models.service import Service
from app.utils.passwords import hash_password

INITIAL_SERVICES = [
    {
        "name": "Ajuste fino de vestido",
        "description": (
            "Ajustes delicados em vestidos sociais, de festa e peças com acabamento especial."
        ),
        "category": "Ajustes premium",
        "duration_minutes": 60,
        "price_type": PriceType.QUOTE,
        "fixed_price": None,
        "highlighted": True,
    },
    {
        "name": "Barra e caimento",
        "description": "Ajuste de barra, caimento e pequenos acabamentos para peças femininas.",
        "category": "Ajustes rápidos",
        "duration_minutes": 60,
        "price_type": PriceType.FIXED,
        "fixed_price": Decimal("85.00"),
        "highlighted": True,
    },
    {
        "name": "Reforma de peça especial",
        "description": "Transformação, remodelagem e atualização de roupas com valor afetivo.",
        "category": "Reformas",
        "duration_minutes": 90,
        "price_type": PriceType.QUOTE,
        "fixed_price": None,
        "highlighted": True,
    },
    {
        "name": "Consultoria de acabamento",
        "description": "Avaliação técnica de tecido, acabamento, prazo e viabilidade da peça.",
        "category": "Avaliação",
        "duration_minutes": 60,
        "price_type": PriceType.FIXED,
        "fixed_price": Decimal("120.00"),
        "highlighted": False,
    },
]


async def seed_admin(session: AsyncSession) -> None:
    print("Seed: verificando administrador inicial...")
    settings = get_settings()

    statement = (
        insert(AdminUser)
        .values(
            name=settings.seed_admin_name,
            email=settings.seed_admin_email,
            password_hash=hash_password(settings.seed_admin_password),
            is_active=True,
            is_superuser=True,
        )
        .on_conflict_do_nothing(index_elements=["email"])
    )
    await session.execute(statement)
    print("Seed: administrador inicial sincronizado.")


async def seed_services(session: AsyncSession) -> None:
    print("Seed: sincronizando serviços iniciais...")
    existing_result = await session.execute(select(Service).where(Service.name.in_([service["name"] for service in INITIAL_SERVICES])))
    existing_by_name = {service.name: service for service in existing_result.scalars()}

    for service_data in INITIAL_SERVICES:
        existing = existing_by_name.get(service_data["name"])
        if existing:
            for field, value in service_data.items():
                setattr(existing, field, value)
            existing.is_active = True
            continue
        session.add(Service(is_active=True, **service_data))
    print("Seed: serviços iniciais sincronizados.")


async def seed_availability(session: AsyncSession, months_ahead: int = 6) -> None:
    print("Seed: sincronizando agenda dos próximos 6 meses...")
    today = datetime.now().date()
    end_date = today + timedelta(days=months_ahead * 31)
    new_slots: list[dict] = []
    cursor = today

    while cursor <= end_date:
        for hour in allowed_hours_for_date(datetime.combine(cursor, time())):
            starts_at = datetime.combine(cursor, time(hour=hour))
            ends_at = starts_at + timedelta(hours=1)
            new_slots.append(
                {
                    "starts_at": starts_at,
                    "ends_at": ends_at,
                    "status": AvailabilityStatus.AVAILABLE,
                    "reason": None,
                }
            )
        cursor += timedelta(days=1)

    if new_slots:
        statement = (
            insert(AvailabilitySlot)
            .values(new_slots)
            .on_conflict_do_nothing(index_elements=["starts_at", "ends_at"])
        )
        result = await session.execute(statement)
        inserted_count = result.rowcount if result.rowcount is not None else 0
    else:
        inserted_count = 0

    print(f"Seed: {inserted_count} horários novos adicionados.")


async def run_seed() -> None:
    async with AsyncSessionLocal() as session:
        print("Seed: iniciando...")
        await session.execute(text("SET statement_timeout = '5min'"))
        await seed_admin(session)
        await session.commit()
        await seed_services(session)
        await session.commit()
        await seed_availability(session)
        await session.commit()
        print("Seed: concluído.")


def main() -> None:
    import asyncio

    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
