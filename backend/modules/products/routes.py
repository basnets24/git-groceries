from flask import Blueprint, jsonify, request

from exceptions import ValidationError
from models.user import UserRole
from modules.auth.decorators import auth_required, roles_required
from . import services

products_bp = Blueprint("products", __name__)


@products_bp.route("/api/categories")
@auth_required
def get_categories():
    categories = services.get_all_categories()
    return jsonify({"categories": categories})


@products_bp.route("/api/products")
@auth_required
def get_products():
    category_ids = request.args.getlist("category_id", type=int)
    min_price = request.args.get("min_price", type=float)
    max_price = request.args.get("max_price", type=float)
    min_weight = request.args.get("min_weight", type=float)
    max_weight = request.args.get("max_weight", type=float)
    
    if not category_ids:
        category_ids = None
    
    products = services.get_products(category_ids, min_price, max_price, min_weight, max_weight)
    return jsonify({"products": products})


@products_bp.route("/api/products", methods=["POST"])
@roles_required(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SUPERADMIN)
def create_product():
    data = request.get_json()
    required = ["name", "price", "weight", "category_id"]
    if data is None or not all(key in data for key in required):
        raise ValidationError(f"Missing required fields: {required}")

    if not services.category_exists(data["category_id"]):
        raise ValidationError("Invalid category_id")

    initial_qty = data.get("quantity", 0)
    product = services.create_product(
        name=data["name"],
        price=data["price"],
        weight=data["weight"],
        category_id=data["category_id"],
        quantity=initial_qty,
    )
    return jsonify({"product": product}), 201

@products_bp.route("/api/products/<int:product_id>", methods=["DELETE"])
@roles_required(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SUPERADMIN)
def delete_product(product_id: int):
    from exceptions import NotFoundError
    if not services.delete_product(product_id):
        raise NotFoundError("Product not found")
    return jsonify({"message": f"Product {product_id} has been deactivated"})
