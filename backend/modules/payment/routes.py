"""Placeholder payment processing routes."""

from flask import jsonify

from modules.auth.decorators import auth_required
from . import payment_bp, services


@payment_bp.route("/api/payments", methods=["POST"])
@auth_required
def create_payment_intent():
    services.ensure_ready()
    return jsonify({"message": "Payment processing not implemented yet"}), 501
