from flask import g, jsonify, request

from exceptions import AuthError
from modules.auth.decorators import auth_required

from . import delivery_bp, services


@delivery_bp.route("/api/delivery/mine", methods=["GET"])
@auth_required
def list_my_deliveries():
    auth_payload = getattr(g, "auth_payload", None) or {}
    customer_id = auth_payload.get("customerID")
    if customer_id is None:
        raise AuthError("Missing customer identity in token", 401)
    trips = services.list_customer_deliveries(customer_id)
    pending = services.list_pending_dispatch_orders(customer_id)
    return jsonify({"trips": trips, "pending": pending}), 200


@delivery_bp.route("/api/delivery/validate-zone", methods=["POST"])
@auth_required
def validate_zone():
    body = request.get_json(silent=True) or {}
    address = body.get("address", "").strip()
    if not address:
        return jsonify({"error": "address is required"}), 400
    try:
        services.validate_delivery_zone(address)
        return jsonify({"valid": True}), 200
    except Exception as e:
        return jsonify({"valid": False, "error": str(e)}), 400


@delivery_bp.route("/api/delivery/<int:trip_id>/complete", methods=["POST"])
@auth_required
def complete_delivery(trip_id: int):
    body = request.get_json(silent=True) or {}
    auth_payload = getattr(g, "auth_payload", None) or {}
    customer_id = auth_payload.get("customerID")
    if customer_id is None:
        raise AuthError("Missing customer identity in token", 401)
    order_id = body.get("order_id")
    if not order_id:
        return jsonify({"error": "order_id is required"}), 400
    services.complete_trip(trip_id, int(order_id), customer_id)
    return jsonify({"ok": True}), 200


@delivery_bp.route("/api/delivery/<int:trip_id>/status", methods=["GET"])
@auth_required
def delivery_status(trip_id: int):
    result = services.get_trip_status(trip_id)
    if result is None:
        return jsonify({"error": "Trip not found"}), 404
    return jsonify(result), 200
