"""Placeholder routes for checkout/order processing."""

from flask import jsonify

from . import checkout_bp, services


@checkout_bp.route("/api/checkout", methods=["POST"])
def create_checkout_session():
    """Placeholder endpoint for starting checkout."""
    services.ensure_ready()
    return jsonify({"message": "Checkout module not implemented yet"}), 501
