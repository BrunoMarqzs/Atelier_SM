"""Opt-in isolated PostgreSQL tests. Never read the application's database URL."""
import asyncio
import importlib.util
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config.settings import Settings
from app.services.push_service import dispatch_batch


@pytest.fixture(scope="module")
def postgres_url(tmp_path_factory):
    binary = os.environ.get("PG_TEST_BIN")
    if not binary:
        pytest.skip("Set PG_TEST_BIN to run isolated PostgreSQL integration tests")
    directory = tmp_path_factory.mktemp("push_postgres")
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    subprocess.run([str(Path(binary) / "initdb"), "-D", str(directory), "-U", "postgres",
                    "-A", "trust", "--no-locale", "-E", "UTF8"],
                   check=True, capture_output=True, creationflags=flags)
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    log = (directory / "test-server.log").open("w")
    process = subprocess.Popen(
        [str(Path(binary) / "postgres"), "-D", str(directory), "-h", "127.0.0.1",
         "-p", str(port)], stdout=log, stderr=log, creationflags=flags,
    )
    try:
        for _ in range(100):
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=.2):
                    break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError("Temporary PostgreSQL did not start")
        yield f"postgresql+asyncpg://postgres@127.0.0.1:{port}/postgres"
    finally:
        subprocess.run([str(Path(binary) / "pg_ctl"), "-D", str(directory), "-m", "fast",
                        "stop"], capture_output=True, creationflags=flags, timeout=20)
        process.wait(timeout=20)
        log.close()


async def test_durable_worker_real_postgres(postgres_url, monkeypatch):
    engine = create_async_engine(postgres_url)
    factory = async_sessionmaker(engine)
    settings = Settings(push_enabled=True, push_admin_id=1, push_vapid_public_key="public",
                        push_vapid_private_key="private", push_vapid_subject="mailto:a@b.test")
    spec = importlib.util.spec_from_file_location(
        "push_migration", Path("migrations/versions/20261020_0011_web_push.py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    statements = []
    from types import SimpleNamespace
    module.op = SimpleNamespace(execute=statements.append)
    module.upgrade()
    try:
        async with engine.begin() as conn:
            await conn.execute(text(
                "CREATE TABLE admin_users(id INTEGER PRIMARY KEY, is_active BOOL)"
            ))
            await conn.execute(text("""
                CREATE TABLE notifications(id INTEGER PRIMARY KEY, event_type TEXT, channel TEXT,
                    recipient_type TEXT, created_at TIMESTAMPTZ DEFAULT now())
            """))
            for statement in statements:
                await conn.execute(text(statement))
            await conn.execute(text("INSERT INTO admin_users VALUES (1,true),(2,true)"))
            await conn.execute(text("""
                INSERT INTO push_subscriptions(admin_id,endpoint,p256dh,auth,after_event_id)
                VALUES (1,'https://web.push.apple.com/1','key','key',1),
                       (2,'https://web.push.apple.com/2','key','key',0)
            """))
            await conn.execute(text("""
                INSERT INTO notifications(id,event_type,channel,recipient_type)
                VALUES (1,'request_created','internal','admin'),
                       (2,'request_created','internal','admin'),
                       (3,'request_approved','internal','admin')
            """))
        sent = []

        def success(sub, event, _settings):
            sent.append((sub["admin_id"], event))
            time.sleep(.05)
            return 201

        # Concurrent workers + retry of the dispatcher must send only once.
        await asyncio.gather(*[
            dispatch_batch(factory, success, settings) for _ in range(2)
        ])
        await dispatch_batch(factory, success, settings)
        assert sent == [(1, 2)]
        async with engine.begin() as conn:
            assert await conn.scalar(text("SELECT status FROM push_deliveries")) == "sent"
            assert await conn.scalar(text("""
                SELECT relrowsecurity FROM pg_class WHERE relname='push_subscriptions'
            """))
            await conn.execute(text("""
                INSERT INTO notifications(id,event_type,channel,recipient_type)
                VALUES (4,'request_created','internal','admin')
            """))

        def offline(*_):
            raise OSError("transport unavailable")

        await dispatch_batch(factory, offline, settings)
        async with engine.begin() as conn:
            assert await conn.scalar(text(
                "SELECT status FROM push_deliveries WHERE event_id=4"
            )) == "pending"
            # The committed event remains intact regardless of transport failure.
            assert await conn.scalar(text("SELECT count(*) FROM notifications")) == 4
            await conn.execute(text(
                "UPDATE push_deliveries SET next_attempt_at=now() WHERE event_id=4"
            ))
        await dispatch_batch(factory, success, settings)
        assert sent == [(1, 2), (1, 4)]
        async with engine.begin() as conn:
            await conn.execute(text("UPDATE push_subscriptions SET enabled=false"))
            await conn.execute(text("""
                INSERT INTO notifications(id,event_type,channel,recipient_type)
                VALUES (5,'request_created','internal','admin')
            """))
        await dispatch_batch(factory, success, settings)
        assert len(sent) == 2
        async with engine.begin() as conn:
            await conn.execute(text("UPDATE push_subscriptions SET enabled=true WHERE admin_id=1"))
        await dispatch_batch(factory, lambda *_: 410, settings)
        async with engine.connect() as conn:
            assert not await conn.scalar(text(
                "SELECT enabled FROM push_subscriptions WHERE admin_id=1"
            ))
        # Real authenticated route lifecycle against the same isolated DB.
        import base64

        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec
        from fastapi import FastAPI
        from httpx import ASGITransport, AsyncClient

        from app.config.database import get_session
        from app.routes import push
        from app.utils.security import require_admin_user

        async def test_session():
            async with factory() as session:
                yield session

        app = FastAPI()
        app.include_router(push.router)
        app.dependency_overrides[get_session] = test_session
        app.dependency_overrides[require_admin_user] = lambda: SimpleNamespace(id=1)
        monkeypatch.setattr(push, "get_settings", lambda: settings)
        key = ec.generate_private_key(ec.SECP256R1()).public_key().public_bytes(
            serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
        )
        payload = {
            "endpoint": "https://web.push.apple.com/1",
            "p256dh": base64.urlsafe_b64encode(key).decode().rstrip("="),
            "auth": base64.urlsafe_b64encode(b"x" * 16).decode().rstrip("="),
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            for _ in range(2):
                assert (await client.post("/admin/push/subscribe", json=payload)).status_code == 200
            async with engine.connect() as conn:
                assert await conn.scalar(text(
                    "SELECT count(*) FROM push_subscriptions WHERE admin_id=1"
                )) == 1
                assert await conn.scalar(text(
                    "SELECT after_event_id FROM push_subscriptions WHERE admin_id=1"
                )) == 5
            # Reactivation does not replay event 5.
            await dispatch_batch(factory, success, settings)
            assert len(sent) == 2
            response = await client.post("/admin/push/unsubscribe", json=payload)
            assert response.json() == {"enabled": False}
            response = await client.post("/admin/push/status", json=payload)
            assert response.json() == {"enabled": False}
            settings.push_enabled = False
            assert (await client.post("/admin/push/subscribe", json=payload)).status_code == 503
    finally:
        await engine.dispose()


async def test_full_migration_chain_and_push_rollback(postgres_url):
    engine = create_async_engine(postgres_url, isolation_level="AUTOCOMMIT")
    try:
        async with engine.connect() as conn:
            await conn.execute(text("CREATE DATABASE push_full_chain"))
    finally:
        await engine.dispose()
    env = os.environ.copy()
    env.update({
        "DATABASE_URL": postgres_url.rsplit("/", 1)[0] + "/push_full_chain",
        "APP_ENV": "development", "PRODUCTION_DATABASE_URL": "", "STAGING_DATABASE_URL": "",
        "PUSH_ENABLED": "false",
    })
    for command in (["upgrade", "head"], ["downgrade", "20260707_0010"], ["upgrade", "head"]):
        result = subprocess.run(
            [sys.executable, "-m", "alembic", *command], env=env,
            capture_output=True, text=True, timeout=60,
        )
        assert result.returncode == 0, result.stderr
