"""Isolated, loopback-only lab. Never imports the application before replacing DB settings."""
import argparse
import asyncio
import base64
import json
import os
import secrets
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--contact", required=True)
    parser.add_argument("--port", type=int, default=8084)
    parser.add_argument("--pg-port", type=int, default=55439)
    parser.add_argument("--pg-bin", default="C:/Program Files/PostgreSQL/17/bin")
    args = parser.parse_args()
    if "@" not in args.contact or any(char.isspace() for char in args.contact):
        parser.error("A valid contact email is required")
    root = Path(__file__).resolve().parents[2]
    os.chdir(root)
    runtime = root / "storage" / "push-local"
    runtime.mkdir(parents=True, exist_ok=True)
    config_file = runtime / "private-config.json"
    if not config_file.exists():
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec

        key = ec.generate_private_key(ec.SECP256R1())

        def encode(value):
            return base64.urlsafe_b64encode(value).decode().rstrip("=")

        config = {
            "db_password": secrets.token_urlsafe(24),
            "admin_password": secrets.token_urlsafe(18),
            "jwt": secrets.token_urlsafe(48),
            "public": encode(key.public_key().public_bytes(
                serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
            )),
            "private": encode(key.private_bytes(
                serialization.Encoding.DER, serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )),
        }
        config_file.write_text(json.dumps(config), encoding="utf-8")
    config = json.loads(config_file.read_text(encoding="utf-8"))
    cluster = runtime / "postgres"
    pg = Path(args.pg_bin)
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    if not (cluster / "PG_VERSION").exists():
        password_file = runtime / "pg-password"
        password_file.write_text(config["db_password"], encoding="utf-8")
        subprocess.run([
            str(pg / "initdb"), "-D", str(cluster), "-U", "postgres",
            "-A", "scram-sha-256", "--pwfile", str(password_file), "--no-locale", "-E", "UTF8",
        ], check=True, creationflags=flags)
    # Reject an occupied port instead of connecting to an unrelated DB or web server.
    import socket
    for port in (args.port, args.pg_port):
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", port))
    subprocess.run([
        str(pg / "pg_ctl"), "-D", str(cluster), "-l", str(runtime / "postgres.log"),
        "-o", f"-h 127.0.0.1 -p {args.pg_port}", "-w", "start",
    ], check=True, creationflags=flags)
    os.environ.update({
        "APP_ENV": "development",
        "DATABASE_URL": (
            f"postgresql+asyncpg://postgres:{config['db_password']}"
            f"@127.0.0.1:{args.pg_port}/postgres"
        ),
        "PRODUCTION_DATABASE_URL": "", "STAGING_DATABASE_URL": "",
        "JWT_SECRET_KEY": config["jwt"],
        "SEED_ADMIN_NAME": "Administradora TESTE",
        "SEED_ADMIN_EMAIL": "admin@teste.atelier.local",
        "SEED_ADMIN_PASSWORD": config["admin_password"],
        "UPLOAD_PROVIDER": "local", "DATABASE_UPLOAD_STORAGE_ENABLED": "true",
        "LOCAL_UPLOAD_DIR": str(runtime / "uploads"),
        "PUBLIC_UPLOAD_BASE_URL": "/uploads",
        "PUBLIC_WEB_BASE_URL": f"http://localhost:{args.port}",
        "PUSH_ENABLED": "true", "PUSH_ADMIN_ID": "1",
        "PUSH_VAPID_PUBLIC_KEY": config["public"],
        "PUSH_VAPID_PRIVATE_KEY": config["private"],
        "PUSH_VAPID_SUBJECT": f"mailto:{args.contact}",
    })
    try:
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"],
                       check=True, creationflags=flags)

        async def seed():
            from app.commands.seed_database import seed_admin, seed_announcements, seed_services
            from app.config.database import AsyncSessionLocal, engine
            async with AsyncSessionLocal() as session:
                await seed_admin(session)
                await seed_services(session)
                await seed_announcements(session)
                await session.commit()
            await engine.dispose()

        asyncio.run(seed())
        import uvicorn
        from fastapi.responses import FileResponse
        from starlette.exceptions import HTTPException
        from starlette.staticfiles import StaticFiles

        from app.main import create_app

        frontend = root.parent / "frontend" / "dist"
        if not (frontend / "index.html").is_file():
            raise RuntimeError("Build frontend with EXPO_PUBLIC_API_BASE_URL=/api first")

        class LabFrontend(StaticFiles):
            async def get_response(self, path, scope):
                if path.startswith("api/"):
                    raise HTTPException(404)
                try:
                    return await super().get_response(path, scope)
                except HTTPException as exc:
                    if exc.status_code != 404 or "." in path.rsplit("/", 1)[-1]:
                        raise
                    return FileResponse(frontend / "index.html")

        app = create_app()
        app.mount("/", LabFrontend(directory=frontend, html=True))
        (runtime / "access.txt").write_text(
            f"AMBIENTE DE TESTE - SEM DADOS REAIS\nhttp://localhost:{args.port}/admin\n"
            f"Login: admin@teste.atelier.local\nSenha: {config['admin_password']}\n",
            encoding="utf-8",
        )
        print(f"Lab ready on http://localhost:{args.port}. Access: {runtime / 'access.txt'}",
              flush=True)
        uvicorn.run(app, host="127.0.0.1", port=args.port, access_log=False)
    finally:
        subprocess.run([str(pg / "pg_ctl"), "-D", str(cluster), "-m", "fast", "stop"],
                       creationflags=flags)


if __name__ == "__main__":
    main()
