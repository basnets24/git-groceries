from functools import wraps
from typing import Any, Callable, TypeVar, Union, cast

from flask import g, request

from exceptions import AuthError
from models.user import UserRole

from . import services

F = TypeVar("F", bound=Callable[..., Any])


def _ensure_auth_context() -> dict:
    """Ensure flask.g has an auth payload; return it."""
    payload = getattr(g, "auth_payload", None)
    if payload is not None:
        return payload

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise AuthError("Missing token", 401)

    token = auth_header.split(" ", 1)[1]
    payload = services.decode_token(token)

    g.auth_token = token
    g.auth_payload = payload
    return payload


def auth_required(fn: F) -> F:
    """Decorator that ensures a valid Bearer token and stores it on flask.g."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        _ensure_auth_context()
        return fn(*args, **kwargs)

    return cast(F, wrapper)


def roles_required(*roles: Union[UserRole, str]) -> Callable[[F], F]:
    """Decorator ensuring the authenticated user has one of the allowed roles."""

    if not roles:
        raise ValueError("roles_required expects at least one role")

    allowed = {
        role.value if isinstance(role, UserRole) else str(role).upper()
        for role in roles
    }

    def decorator(fn: F) -> F:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            payload = _ensure_auth_context()
            user_role = payload.get("role")
            if user_role not in allowed:
                raise AuthError("Forbidden", 403)
            return fn(*args, **kwargs)

        return cast(F, wrapper)

    return decorator
