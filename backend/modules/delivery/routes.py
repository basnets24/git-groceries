"""Placeholder delivery scheduling routes."""

from flask import jsonify

from models.user import UserRole
from modules.auth.decorators import roles_required
from . import delivery_bp, services


@delivery_bp.route("/api/delivery/schedule", methods=["POST"])
@roles_required(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SUPERADMIN)
def schedule_delivery():
    services.ensure_ready()
    return jsonify({"message": "Delivery scheduling not implemented yet"}), 501
