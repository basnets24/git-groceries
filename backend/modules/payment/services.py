import os
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict

from dotenv import load_dotenv

from exceptions import ServiceError, ValidationError
from integrations.stripe.client import StripeClient, StripeConfig
from . import repository

load_dotenv()

STRIPE_API_KEY = os.getenv("STRIPE_API_KEY")
STRIPE_API_VERSION = os.getenv("STRIPE_API_VERSION", "2023-10-16")


def _ensure_stripe_config() -> StripeConfig:
    if not STRIPE_API_KEY:
        raise ServiceError("Stripe API key is not configured")
    return StripeConfig(api_key=STRIPE_API_KEY, api_version=STRIPE_API_VERSION)


def _format_amount(amount: Decimal) -> int:
    return int(amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) * 100)


def create_payment_intent(order_id: int, amount: Decimal, currency: str = "usd") -> Dict:
    if amount <= 0:
        raise ValidationError("Total amount must be greater than zero")

    client = StripeClient(_ensure_stripe_config())
    try:
        intent = client.create_payment_intent(_format_amount(amount), currency)
    except Exception as exc:
        raise ServiceError("Failed to create Stripe payment intent") from exc

    repository.insert_payment(
        order_id=order_id,
        provider="Stripe",
        provider_ref=intent["id"],
        amount=float(amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        status="PENDING",
    )

    return {
        "payment_intent_id": intent["id"],
        "client_secret": intent["client_secret"],
        "amount": float(amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "currency": intent["currency"],
        "status": intent["status"],
    }
