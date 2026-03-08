import random
from app.core.time import utc_now_naive

from app.domain.entities import ProviderPrice


class RyanairPyProviderAdapter:
    """Adapter placeholder desacoplado del proveedor externo real."""

    def get_price(self, origin: str, destination: str, travel_date: str) -> ProviderPrice:
        base = random.uniform(20, 200)
        return ProviderPrice(price=round(base, 2), currency="EUR", captured_at=utc_now_naive())
