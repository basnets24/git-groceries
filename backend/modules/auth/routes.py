from flask import Blueprint, jsonify, request

from exceptions import AuthError, ValidationError
from . import services

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    identifier = data.get("emailOrUsername")
    password = data.get("password")

    if not identifier or not password:
        raise ValidationError("emailOrUsername and password are required")

    token, user = services.authenticate_user(identifier, password)

    return jsonify(
        {
            "message": "Login successful",
            "token": token,
            "customerID": user.id,
            "username": user.username,
            "role": user.role.value,
        }
    )


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    missing = [field for field in ("username", "email", "password") if not data.get(field)]
    if missing:
        raise ValidationError(f"Missing fields: {', '.join(missing)}")

    services.register_user(username, email, password)

    return jsonify({"message": "User created successfully"}), 201


@auth_bp.route("/api/auth/me", methods=["GET"])
def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise AuthError("Missing token", 401)

    token = auth_header.split(" ", 1)[1]
    profile = services.get_user_profile_from_token(token)

    return jsonify(profile)
