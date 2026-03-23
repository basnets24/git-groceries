"""Placeholder delivery scheduling routes."""

from flask import jsonify

from . import delivery_bp, services


@delivery_bp.route("/api/delivery/schedule", methods=["POST"])
def schedule_delivery():
    services.ensure_ready()
    return jsonify({"message": "Delivery scheduling not implemented yet"}), 501
