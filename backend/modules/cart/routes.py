from flask import Blueprint, jsonify, request

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
        return jsonify({"error": "Missing 'product_id' in request body"}), 400

    quantity = data.get("quantity", 1)
    if not isinstance(quantity, int) or quantity < 1:
        return jsonify({"error": "Quantity must be a positive integer"}), 400

    try:
        result = services.add_to_cart(
            customer_id=customer_id,
            product_id=data["product_id"],
            quantity=quantity,
        )
    except services.CartServiceError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    return jsonify(result), 201
