"""Order history routes."""

from flask import Blueprint, jsonify, g

from exceptions import AuthError
from modules.auth.decorators import auth_required
from . import services

orders_bp = Blueprint("orders", __name__)


@orders_bp.route("/api/orders")
@auth_required
def get_orders():
    auth_payload = getattr(g, "auth_payload", None)
    if auth_payload is None or "customerID" not in auth_payload:
        raise AuthError("Missing token", 401)

    customer_id = auth_payload["customerID"]
    orders = services.get_customer_orders(customer_id)
    return jsonify({"orders": orders})