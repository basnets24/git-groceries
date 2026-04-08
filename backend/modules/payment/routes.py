"""Payment processing routes using Stripe checkout."""

from flask import jsonify, g

from exceptions import AuthError
from modules.auth.decorators import auth_required
from modules.checkout import services as checkout_services
from . import payment_bp


@payment_bp.route("/api/payments", methods=["POST"])
@auth_required
def create_payment_intent():
    auth_payload = getattr(g, "auth_payload", None)
    if auth_payload is None or "customerID" not in auth_payload:
        raise AuthError("Missing token", 401)

    customer_id = auth_payload["customerID"]
    checkout_result = checkout_services.create_checkout_session(customer_id)
    return jsonify(checkout_result["payment_intent"]), 201
