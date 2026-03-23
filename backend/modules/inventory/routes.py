from flask import Blueprint, jsonify, request

from exceptions import NotFoundError, ValidationError
from models.user import UserRole
from modules.auth.decorators import roles_required
from . import services

inventory_bp = Blueprint("inventory", __name__)


@inventory_bp.route("/api/inventory")
def get_inventory():
    inventory = services.get_inventory()
    return jsonify({"inventory": inventory})


@inventory_bp.route("/api/inventory/<int:product_id>", methods=["PUT"])
@roles_required(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SUPERADMIN)
def update_inventory(product_id: int):
    data = request.get_json()
    if data is None or "quantity" not in data:
        raise ValidationError("Missing 'quantity' in request body")

    quantity = data["quantity"]
    if not isinstance(quantity, int) or quantity < 0:
        raise ValidationError("Quantity must be a non-negative integer")

    updated_item = services.update_inventory(product_id, quantity)
    if updated_item is None:
        raise NotFoundError("Product not found in inventory")

    return jsonify({"item": updated_item})
