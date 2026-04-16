from flask import Blueprint, jsonify
from modules.auth.decorators import roles_required
from models.user import UserRole

from . import services

delivery_bp = Blueprint("delivery", __name__)

delivery_bp.route("/api/delivery/dispatch", methods=["POST"])
roles_required(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SUPERADMIN)
def dispatch():
    try:
        result = services.dispatch_orders()
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
