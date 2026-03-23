from flask import Blueprint, jsonify, request, g

from exceptions import AuthError, ValidationError
from modules.auth.decorators import auth_required
from . import services

cart_bp = Blueprint("cart", __name__)


def _ensure_customer(customer_id: int) -> None:
    payload = getattr(g, "auth_payload", None)
    if payload is None or payload.get("customerID") != customer_id:
        raise AuthError("Forbidden", 403)


@cart_bp.route("/api/cart/<int:customer_id>")
@auth_required
def get_cart(customer_id: int):
    _ensure_customer(customer_id)
    items = services.get_cart(customer_id)
    return jsonify({"customer_id": customer_id, "items": items})


@cart_bp.route("/api/cart/<int:customer_id>", methods=["POST"])
@auth_required
def add_to_cart(customer_id: int):
    _ensure_customer(customer_id)
    data = request.get_json()
    if data is None or "product_id" not in data:
        raise ValidationError("Missing 'product_id' in request body")

    quantity = data.get("quantity", 1)
    if not isinstance(quantity, int) or quantity < 1:
        raise ValidationError("Quantity must be a positive integer")

    result = services.add_to_cart(
        customer_id=customer_id,
        product_id=data["product_id"],
        quantity=quantity,
    )

    return jsonify(result), 201
