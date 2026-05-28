from __future__ import annotations

import ssl
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError


SSL_QUERY_KEYS = {"ssl", "sslmode"}
SSL_REQUIRED_VALUES = {"1", "true", "require", "required", "verify-ca", "verify-full"}
SSL_DISABLED_VALUES = {"0", "false", "disable", "disabled", "allow", "prefer"}


@dataclass(frozen=True)
class DatabaseConnectionSettings:
    url: str
    connect_args: dict[str, Any]


def build_asyncpg_connection_settings(raw_url: str) -> DatabaseConnectionSettings:
    normalized_url = _normalize_asyncpg_scheme(raw_url.strip())

    try:
        parsed_url = make_url(normalized_url)
    except ArgumentError as exc:
        raise ValueError(
            "DATABASE_URL inválida. Confira se usuário, senha, host e porta estão corretos. "
            "Se a senha tiver caracteres especiais como @, #, /, : ou %, use URL encode."
        ) from exc

    if not parsed_url.host or not parsed_url.database:
        raise ValueError(
            "DATABASE_URL inválida. Use o formato "
            "postgresql+asyncpg://USUARIO:SENHA_URL_ENCODED@HOST:PORTA/BANCO. "
            "Confira se existem exatamente duas barras depois do driver: postgresql+asyncpg://"
        )

    query = dict(parsed_url.query)
    ssl_value = _pop_first(query, SSL_QUERY_KEYS)
    connect_args: dict[str, Any] = {}

    if _requires_ssl(ssl_value, parsed_url.host):
        connect_args["ssl"] = _build_ssl_context(ssl_value)

    if _uses_transaction_pooler(parsed_url.host, parsed_url.port, query):
        connect_args["statement_cache_size"] = 0
        connect_args["prepared_statement_name_func"] = lambda: f"__asyncpg_{uuid4()}__"

    cleaned_url = parsed_url.set(query=query)
    return DatabaseConnectionSettings(url=cleaned_url.render_as_string(hide_password=False), connect_args=connect_args)


def _normalize_asyncpg_scheme(raw_url: str) -> str:
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw_url


def _pop_first(query: dict[str, Any], keys: set[str]) -> str | None:
    for key in keys:
        if key in query:
            return str(query.pop(key))
    return None


def _requires_ssl(value: str | None, host: str | None = None) -> bool:
    if host and host.endswith(".supabase.co"):
        return True

    if value is None:
        return False

    normalized = value.lower().strip()
    if normalized in SSL_DISABLED_VALUES:
        return False
    return normalized in SSL_REQUIRED_VALUES


def _build_ssl_context(value: str | None) -> ssl.SSLContext:
    normalized = (value or "require").lower().strip()
    if normalized in {"verify-ca", "verify-full"}:
        return ssl.create_default_context()

    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    return context


def _uses_transaction_pooler(host: str | None, port: int | None, query: dict[str, Any]) -> bool:
    return (
        bool(host and "pooler.supabase.com" in host)
        or port == 6543
        or str(query.get("prepared_statement_cache_size", "")).strip() == "0"
    )
