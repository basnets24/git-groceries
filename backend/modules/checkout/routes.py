"""Checkout routes that start Stripe payment flow."""

from flask import jsonify, g

from exceptions import AuthError
from modules.auth.decorators import auth_required
from . import checkout_bp, services


@checkout_bp.route("/api/checkout", methods=["POST"])
@auth_required
def create_checkout_session():
    auth_payload = getattr(g, "auth_payload", None)
    if auth_payload is None or "customerID" not in auth_payload:
        raise AuthError("Missing token", 401)

    customer_id = auth_payload["customerID"]
    result = services.create_checkout_session(customer_id)
    return jsonify(result), 201
