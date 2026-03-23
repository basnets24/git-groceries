from flask import Blueprint, jsonify, request

from . import services

inventory_bp = Blueprint("inventory", __name__)


@inventory_bp.route("/api/inventory")
def get_inventory():
    inventory = services.get_inventory()
    return jsonify({"inventory": inventory})


@inventory_bp.route("/api/inventory/<int:product_id>", methods=["PUT"])
def update_inventory(product_id: int):
    data = request.get_json()
    if data is None or "quantity" not in data:
        return jsonify({"error": "Missing 'quantity' in request body"}), 400

    quantity = data["quantity"]
    if not isinstance(quantity, int) or quantity < 0:
        return jsonify({"error": "Quantity must be a non-negative integer"}), 400

    updated_item = services.update_inventory(product_id, quantity)
    if updated_item is None:
        return jsonify({"error": "Product not found in inventory"}), 404

    return jsonify({"item": updated_item})
