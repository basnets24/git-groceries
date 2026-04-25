from __future__ import annotations

from typing import Any, Dict, Optional, TypeVar

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


class APIError(Exception):
    """Base exception for API errors that include an HTTP status code."""

    default_status = 400

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        *,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code or self.default_status
        self.extra = extra or {}

    def to_dict(self) -> Dict[str, Any]:
        payload = {"error": self.message}
        if self.extra:
            payload["details"] = self.extra
        return payload


class ValidationError(APIError):
    """Input validation failure."""


class NotFoundError(APIError):
    """Requested resource does not exist."""

    default_status = 404


class ConflictError(APIError):
    """Resource state conflicts with the request."""

    default_status = 409


class ServiceError(APIError):
    """Internal service failure surfaced to API callers."""

    default_status = 500


class AuthError(APIError):
    """Authentication or authorization error."""

    default_status = 401


class CartServiceError(APIError):
    """Cart domain errors raised by the service layer."""


TFlask = TypeVar("TFlask", bound=Flask)


def register_error_handlers(app: TFlask) -> TFlask:
    """Attach JSON error handlers for APIError and uncaught exceptions."""

    @app.errorhandler(APIError)
    def handle_api_error(error: APIError):
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        return response

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        response = jsonify({"error": error.description})
        response.status_code = error.code or 500
        return response

    @app.errorhandler(Exception)
    def handle_unexpected(error: Exception):
        app.logger.exception("Unhandled exception", exc_info=error)
        response = jsonify({"error": "Internal server error"})
        response.status_code = 500
        return response

    return app


__all__ = [
    "APIError",
    "AuthError",
    "CartServiceError",
    "ConflictError",
    "NotFoundError",
    "ServiceError",
    "ValidationError",
    "register_error_handlers",
]
