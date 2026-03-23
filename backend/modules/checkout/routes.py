"""Placeholder routes for checkout/order processing."""

from flask import jsonify

from modules.auth.decorators import auth_required
from . import checkout_bp, services


@checkout_bp.route("/api/checkout", methods=["POST"])
@auth_required
def create_checkout_session():
    """Placeholder endpoint for starting checkout."""
    services.ensure_ready()
    return jsonify({"message": "Checkout module not implemented yet"}), 501
