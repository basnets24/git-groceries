from flask import Blueprint, jsonify, request, g

from exceptions import AuthError, ValidationError
from models.user import UserRole
from .decorators import roles_required
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
    token, user = services.authenticate_user(username, password)

    return jsonify({
        "message": "User created successfully",
        "token": token,
        "user": {
            "customerID": user.id,
            "username": user.username,
            "role": user.role.value,
        },
    }), 201


@auth_bp.route("/api/auth/me", methods=["GET"])
def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise AuthError("Missing token", 401)

    token = auth_header.split(" ", 1)[1]
    profile = services.get_user_profile_from_token(token)

    return jsonify(profile)


@auth_bp.route("/api/auth/users/<int:user_id>/role", methods=["PUT"])
@roles_required(UserRole.MANAGER, UserRole.SUPERADMIN)
def assign_role(user_id: int):
    data = request.get_json(silent=True) or {}
    raw_role = data.get("role")

    if not raw_role:
        raise ValidationError("Field 'role' is required")

    try:
        requested_role = UserRole(str(raw_role).upper())
    except ValueError as exc:
        raise ValidationError("Invalid role value") from exc

    if requested_role not in {UserRole.MANAGER, UserRole.EMPLOYEE}:
        raise ValidationError("Role must be MANAGER or EMPLOYEE")

    payload = getattr(g, "auth_payload", None)
    if not payload:
        raise AuthError("Missing token", 401)

    assigner_id = payload.get("customerID")
    if not assigner_id:
        raise AuthError("Missing token", 401)

    updated_user = services.assign_user_role(assigner_id, user_id, requested_role)

    return jsonify(
        {
            "message": "Role updated successfully",
            "userID": updated_user.id,
            "role": updated_user.role.value,
        }
    )


@auth_bp.route("/api/auth/users", methods=["GET"])
@roles_required(UserRole.MANAGER, UserRole.SUPERADMIN)
def search_users():
    email_query = request.args.get("email", "")
    results = services.search_users_by_email(email_query)
    serialized = [
        {
            "userID": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value,
        }
        for user in results
    ]
    return jsonify({"results": serialized})
