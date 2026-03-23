from flask import Blueprint, jsonify, request

from exceptions import ValidationError
from . import services

cart_bp = Blueprint("cart", __name__)


@cart_bp.route("/api/cart/<int:customer_id>")
def get_cart(customer_id: int):
    items = services.get_cart(customer_id)
    return jsonify({"customer_id": customer_id, "items": items})


@cart_bp.route("/api/cart/<int:customer_id>", methods=["POST"])
def add_to_cart(customer_id: int):
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
