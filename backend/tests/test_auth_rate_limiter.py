import pytest

from app.services.auth_service import AuthRateLimiter
from app.utils.errors import TooManyRequestsError


def test_rate_limiter_blocks_after_configured_attempts(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.auth_service.get_settings",
        lambda: type(
            "Settings",
            (),
            {
                "auth_rate_limit_attempts": 3,
                "auth_rate_limit_window_seconds": 300,
            },
        )(),
    )
    limiter = AuthRateLimiter()

    limiter.register_attempt("client:admin@example.com")
    limiter.register_attempt("client:admin@example.com")
    limiter.register_attempt("client:admin@example.com")

    with pytest.raises(TooManyRequestsError):
        limiter.register_attempt("client:admin@example.com")


def test_rate_limiter_reset_clears_attempts(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.auth_service.get_settings",
        lambda: type(
            "Settings",
            (),
            {
                "auth_rate_limit_attempts": 3,
                "auth_rate_limit_window_seconds": 300,
            },
        )(),
    )
    limiter = AuthRateLimiter()

    limiter.register_attempt("client:admin@example.com")
    limiter.register_attempt("client:admin@example.com")
    limiter.reset("client:admin@example.com")
    limiter.register_attempt("client:admin@example.com")

    assert limiter._attempts["client:admin@example.com"]
