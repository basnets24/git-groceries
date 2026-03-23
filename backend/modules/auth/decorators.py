from functools import wraps
from typing import Any, Callable, TypeVar, cast

from flask import g, request

from exceptions import AuthError

from . import services

F = TypeVar("F", bound=Callable[..., Any])


def auth_required(fn: F) -> F:
    """Decorator that ensures a valid Bearer token and stores it on flask.g."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise AuthError("Missing token", 401)

        token = auth_header.split(" ", 1)[1]
        payload = services.decode_token(token)

        g.auth_token = token
        g.auth_payload = payload
        return fn(*args, **kwargs)

    return cast(F, wrapper)
