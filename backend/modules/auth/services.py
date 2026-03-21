import datetime
import os
from typing import Optional, Tuple

import bcrypt
import jwt
import mysql.connector
from dotenv import load_dotenv

from exceptions import AuthError
from models.user import User, UserRole

from . import repository

load_dotenv()

TOKEN_TTL_HOURS = 1
JWT_SECRET = os.getenv("JWT_SECRET")


def _ensure_secret() -> str:
    if not JWT_SECRET:
        raise AuthError("Server misconfiguration: missing JWT secret", 500)
    return JWT_SECRET


def validate_password(password: str) -> Optional[str]:
    """Enforce a minimal password policy."""
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if not any(ch.isupper() for ch in password):
        return "Password must contain at least one uppercase letter."
    if not any(ch.islower() for ch in password):
        return "Password must contain at least one lowercase letter."
    if not any(ch.isdigit() for ch in password):
        return "Password must contain at least one number."
    return None


def create_token(user: User) -> str:
    """Create a signed JWT for the given user."""
    secret = _ensure_secret()
    payload = {
        "customerID": user.id,
        "username": user.username,
        "role": user.role.value,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Decode and validate a JWT."""
    secret = _ensure_secret()
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Invalid or expired token", 401) from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("Invalid or expired token", 401) from exc


def authenticate_user(identifier: str, password: str) -> Tuple[str, User]:
    """Authenticate by username/email and password; return token + user."""
    user = repository.fetch_user_by_identifier(identifier)
    if not user:
        raise AuthError("Invalid username/email or password", 401)

    if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        raise AuthError("Invalid username/email or password", 401)

    token = create_token(user)
    return token, user


def register_user(username: str, email: str, password: str) -> int:
    """Create a new customer user; return its ID."""
    pw_error = validate_password(password)
    if pw_error:
        raise AuthError(pw_error, 400)

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    try:
        return repository.insert_user(username, email, password_hash, UserRole.CUSTOMER)
    except mysql.connector.errors.IntegrityError as exc:
        raise AuthError("Email or username already exists", 400) from exc


def get_user_profile_from_token(token: str) -> dict:
    """Decode a token and return the user profile payload."""
    payload = decode_token(token)
    return {
        "customerID": payload["customerID"],
        "username": payload["username"],
        "role": payload["role"],
    }


def get_user_by_id(user_id: int) -> Optional[User]:
    """Helper for callers that just need the User record."""
    return repository.fetch_user_by_id(user_id)
