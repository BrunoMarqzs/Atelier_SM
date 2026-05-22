from app.utils.passwords import hash_password, hash_token, verify_password


def test_password_hash_is_verifiable_and_salted() -> None:
    first_hash = hash_password("senha-segura-123")
    second_hash = hash_password("senha-segura-123")

    assert first_hash != second_hash
    assert verify_password("senha-segura-123", first_hash)
    assert not verify_password("senha-errada", first_hash)


def test_refresh_token_hash_is_deterministic() -> None:
    assert hash_token("refresh-token") == hash_token("refresh-token")
    assert hash_token("refresh-token") != "refresh-token"
