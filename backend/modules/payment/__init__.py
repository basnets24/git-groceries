"""Payment processing module."""

from flask import Blueprint

payment_bp = Blueprint("payments", __name__)

from . import routes  # noqa: E402,F401
