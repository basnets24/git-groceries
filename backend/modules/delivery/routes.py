from flask import g, jsonify, request

from exceptions import AuthError
from modules.auth.decorators import auth_required, roles_required
from models.user import UserRole

from . import delivery_bp, services


@delivery_bp.route("/api/delivery/dispatch", methods=["POST"])
@roles_required(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SUPERADMIN)
def dispatch():
    try:
        result = services.dispatch_orders()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@delivery_bp.route("/api/delivery/start", methods=["POST"])
@auth_required
def start_delivery():
    body = request.get_json(silent=True) or {}
    order_id = body.get("order_id")
    address = body.get("address")

    if not order_id or not address:
        return jsonify({"error": "order_id and address are required"}), 400

    auth_payload = getattr(g, "auth_payload", None) or {}
    customer_id = auth_payload.get("customerID")

    result = services.start_simulated_delivery(
        int(order_id), str(address), customer_id=customer_id
    )
    return jsonify(result), 201


@delivery_bp.route("/api/delivery/mine", methods=["GET"])
@auth_required
def list_my_deliveries():
    auth_payload = getattr(g, "auth_payload", None) or {}
    customer_id = auth_payload.get("customerID")
    if customer_id is None:
        raise AuthError("Missing customer identity in token", 401)
    return jsonify({"trips": services.list_customer_deliveries(customer_id)}), 200


@delivery_bp.route("/api/delivery/<int:trip_id>/status", methods=["GET"])
@auth_required
def delivery_status(trip_id: int):
    result = services.get_trip_status(trip_id)
    if result is None:
        return jsonify({"error": "Trip not found"}), 404
    return jsonify(result), 200
