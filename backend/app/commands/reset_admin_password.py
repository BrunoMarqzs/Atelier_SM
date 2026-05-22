import argparse
import asyncio

from sqlalchemy import update

from app.config.database import AsyncSessionLocal
from app.config.settings import get_settings
from app.models.admin_user import AdminUser
from app.utils.passwords import hash_password


async def reset_password(password: str) -> None:
    settings = get_settings()
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(AdminUser)
            .where(AdminUser.email == settings.seed_admin_email)
            .values(password_hash=hash_password(password))
        )
        await session.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Redefine a senha do admin inicial.")
    parser.add_argument("password")
    args = parser.parse_args()
    asyncio.run(reset_password(args.password))


if __name__ == "__main__":
    main()
