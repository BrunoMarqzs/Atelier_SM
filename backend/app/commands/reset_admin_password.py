import argparse
import asyncio
from getpass import getpass

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
    parser.add_argument(
        "password",
        nargs="?",
        help="Nova senha. Se omitida, ela será solicitada de forma oculta.",
    )
    args = parser.parse_args()
    password = args.password or getpass("Nova senha do administrador: ")
    if not args.password:
        confirmation = getpass("Confirme a nova senha: ")
        if password != confirmation:
            parser.error("As senhas informadas não coincidem.")
    if len(password) < 12:
        parser.error("A senha deve ter pelo menos 12 caracteres.")
    asyncio.run(reset_password(password))
    print("Senha do administrador redefinida com sucesso.")


if __name__ == "__main__":
    main()
