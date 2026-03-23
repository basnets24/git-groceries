from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict


class UserRole(str, Enum):
    """Supported application roles."""

    CUSTOMER = "CUSTOMER"
    EMPLOYEE = "EMPLOYEE"
    MANAGER = "MANAGER"
    SUPERADMIN = "SUPERADMIN"


@dataclass
class User:
    """Represents an authenticated user record."""

    id: int
    username: str
    email: str
    password_hash: str
    role: UserRole

    @classmethod
    def from_row(cls, row: Dict[str, Any]) -> "User":
        """Build a User dataclass from a MySQL dictionary row."""
        return cls(
            id=row["UserID"],
            username=row["Username"],
            email=row["Email"],
            password_hash=row["PasswordHash"],
            role=UserRole(row["Role"]),
        )
