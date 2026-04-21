from flask import jsonify

from exceptions import NotFoundError
from models.user import UserRole
from modules.auth.decorators import roles_required

from . import admin_bp, repository


@admin_bp.route("/api/admin/orders", methods=["GET"])
@roles_required(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SUPERADMIN)
def list_orders():
    return jsonify({"orders": repository.fetch_all_orders()}), 200


@admin_bp.route("/api/admin/orders/<int:order_id>", methods=["GET"])
@roles_required(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SUPERADMIN)
def get_order(order_id: int):
    order = repository.fetch_order_detail(order_id)
    if order is None:
        raise NotFoundError(f"Order {order_id} not found")
    return jsonify(order), 200
