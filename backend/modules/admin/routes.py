from flask import jsonify, request

from exceptions import NotFoundError, ValidationError
from models.user import UserRole
from modules.auth.decorators import roles_required

from . import admin_bp, fleet, repository


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


@admin_bp.route("/api/admin/robots", methods=["GET"])
@roles_required(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SUPERADMIN)
def list_robots():
    return jsonify({"robots": fleet.list_fleet()}), 200


@admin_bp.route("/api/admin/robots/<int:robot_id>/location", methods=["PATCH"])
@roles_required(UserRole.MANAGER, UserRole.SUPERADMIN)
def update_robot_location(robot_id: int):
    body = request.get_json(silent=True) or {}
    lat = body.get("lat")
    lng = body.get("lng")
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        raise ValidationError("lat and lng are required numbers")
    return jsonify(fleet.update_robot_location(robot_id, float(lat), float(lng))), 200


@admin_bp.route("/api/admin/dispatch/pending", methods=["GET"])
@roles_required(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SUPERADMIN)
def list_pending_dispatch():
    orders = fleet.list_pending_orders()
    return jsonify(
        {
            "orders": orders,
            "auto_dispatch_after_sec": fleet.AUTO_DISPATCH_AFTER_SEC,
            "fleet_size": fleet.FLEET_SIZE,
        }
    ), 200


@admin_bp.route("/api/admin/dispatch/confirm", methods=["POST"])
@roles_required(UserRole.MANAGER, UserRole.SUPERADMIN)
def confirm_dispatch():
    body = request.get_json(silent=True) or {}
    groups = body.get("groups")
    result = fleet.confirm_dispatch(groups)
    return jsonify(result), 201


@admin_bp.route("/api/admin/dispatch/auto", methods=["POST"])
@roles_required(UserRole.MANAGER, UserRole.SUPERADMIN)
def auto_dispatch():
    return jsonify(fleet.auto_dispatch_expired()), 201
