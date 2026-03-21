from flask import Blueprint, jsonify, request

from exceptions import AuthError
from . import services

auth_bp = Blueprint("auth", __name__)


def _error_response(message: str, status: int):
    return jsonify({"error": message}), status


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    identifier = data.get("emailOrUsername")
    password = data.get("password")

    if not identifier or not password:
        return _error_response("emailOrUsername and password are required", 400)

    try:
        token, user = services.authenticate_user(identifier, password)
    except AuthError as exc:
        return _error_response(str(exc), exc.status_code)

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
        return _error_response(f"Missing fields: {', '.join(missing)}", 400)

    try:
        services.register_user(username, email, password)
    except AuthError as exc:
        return _error_response(str(exc), exc.status_code)

    return jsonify({"message": "User created successfully"}), 201


@auth_bp.route("/api/auth/me", methods=["GET"])
def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return _error_response("Missing token", 401)

    token = auth_header.split(" ", 1)[1]
    try:
        profile = services.get_user_profile_from_token(token)
    except AuthError as exc:
        return _error_response(str(exc), exc.status_code)

    return jsonify(profile)
