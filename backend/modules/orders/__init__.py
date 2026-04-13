"""Orders module for fetching customer order history."""

from flask import Blueprint

orders_bp = Blueprint("orders", __name__)

from . import routes  # noqa: E402,F401