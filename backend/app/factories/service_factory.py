from app.models.service import Service
from app.validators.service import ServiceCreate


class ServiceFactory:
    def create(self, payload: ServiceCreate) -> Service:
        return Service(**payload.model_dump())
