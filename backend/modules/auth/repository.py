from typing import Optional

from db import get_db_connection
from models.user import User, UserRole


def fetch_user_by_identifier(identifier: str) -> Optional[User]:
    """Return a user by username or email."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT UserID, Username, Email, PasswordHash, Role
        FROM `User`
        WHERE Email = %s OR Username = %s
        LIMIT 1
        """,
        (identifier, identifier),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    return User.from_row(row) if row else None


def fetch_user_by_id(user_id: int) -> Optional[User]:
    """Return a user by primary key."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT UserID, Username, Email, PasswordHash, Role
        FROM `User`
        WHERE UserID = %s
        """,
        (user_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    return User.from_row(row) if row else None


def insert_user(username: str, email: str, password_hash: str, role: UserRole) -> int:
    """Insert a new user and return its ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO `User` (Username, Email, PasswordHash, Role)
        VALUES (%s, %s, %s, %s)
        """,
        (username, email, password_hash, role.value),
    )
    conn.commit()
    user_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return user_id
