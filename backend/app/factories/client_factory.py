from app.models.client_profile import ClientProfile
from app.validators.client import ClientIdentityInput, normalize_phone


class ClientProfileFactory:
    def create(self, payload: ClientIdentityInput) -> ClientProfile:
        return ClientProfile(
            name=payload.name.strip(),
            phone=payload.phone.strip(),
            normalized_phone=normalize_phone(payload.phone),
        )
