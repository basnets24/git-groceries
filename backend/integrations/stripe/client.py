"""Minimal Stripe client placeholder."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class StripeConfig:
    api_key: str
    api_version: str = "2023-10-16"


class StripeClient:
    """Placeholder Stripe integration used until real SDK wiring is added."""

    def __init__(self, config: StripeConfig) -> None:
        self.config = config

    def create_payment_intent(self, amount_cents: int, currency: str = "usd") -> Dict:
        """Stub payment intent creation."""
        return {
            "id": "pi_NOT_IMPLEMENTED",
            "amount": amount_cents,
            "currency": currency,
            "status": "NOT_IMPLEMENTED",
        }

    def retrieve_payment_intent(self, intent_id: str) -> Optional[Dict]:
        return None
