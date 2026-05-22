from decimal import Decimal
from typing import Protocol

from app.models.enums import PriceType
from app.models.service import Service
from app.utils.errors import DomainError


class PricingStrategy(Protocol):
    def calculate_initial_estimate(self, service: Service) -> Decimal | None:
        pass


class FixedPriceStrategy:
    def calculate_initial_estimate(self, service: Service) -> Decimal | None:
        if service.fixed_price is None:
            raise DomainError("Serviço com preço fixo está sem valor configurado.")
        return service.fixed_price


class QuotePriceStrategy:
    def calculate_initial_estimate(self, service: Service) -> Decimal | None:
        return None


class PricingStrategyFactory:
    def for_service(self, service: Service) -> PricingStrategy:
        if service.price_type == PriceType.FIXED:
            return FixedPriceStrategy()
        return QuotePriceStrategy()
