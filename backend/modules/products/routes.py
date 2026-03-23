from flask import Blueprint, jsonify, request

from . import services

products_bp = Blueprint("products", __name__)


@products_bp.route("/api/products")
def get_products():
    products = services.get_products()
    return jsonify({"products": products})


@products_bp.route("/api/products", methods=["POST"])
def create_product():
    data = request.get_json()
    required = ["name", "price", "weight", "category_id"]
    if data is None or not all(key in data for key in required):
        return jsonify({"error": f"Missing required fields: {required}"}), 400

    if not services.category_exists(data["category_id"]):
        return jsonify({"error": "Invalid category_id"}), 400

    initial_qty = data.get("quantity", 0)
    product = services.create_product(
        name=data["name"],
        price=data["price"],
        weight=data["weight"],
        category_id=data["category_id"],
        quantity=initial_qty,
    )
    return jsonify({"product": product}), 201
