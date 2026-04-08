"""Stripe integration helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

import stripe


@dataclass
class StripeConfig:
    api_key: str
    api_version: str = "2023-10-16"


class StripeClient:
    def __init__(self, config: StripeConfig) -> None:
        self.config = config
        stripe.api_key = config.api_key
        stripe.api_version = config.api_version

    def create_payment_intent(self, amount_cents: int, currency: str = "usd") -> Dict:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            payment_method_types=["card"],
        )
        return {
            "id": intent.id,
            "client_secret": intent.client_secret,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status,
        }

    def retrieve_payment_intent(self, intent_id: str) -> Optional[Dict]:
        intent = stripe.PaymentIntent.retrieve(intent_id)
        return {
            "id": intent.id,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status,
        }
