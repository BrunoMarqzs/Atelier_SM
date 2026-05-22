from secrets import token_urlsafe


def generate_public_request_code() -> str:
    return token_urlsafe(9).replace("-", "").replace("_", "")[:10].upper()
