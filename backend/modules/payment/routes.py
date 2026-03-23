"""Placeholder payment processing routes."""

from flask import jsonify

from . import payment_bp, services


@payment_bp.route("/api/payments", methods=["POST"])
def create_payment_intent():
    services.ensure_ready()
    return jsonify({"message": "Payment processing not implemented yet"}), 501
