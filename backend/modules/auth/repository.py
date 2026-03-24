from typing import List, Optional

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


def update_user_role(user_id: int, role: UserRole) -> None:
    """Update the role for the specified user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE `User`
        SET Role = %s
        WHERE UserID = %s
        """,
        (role.value, user_id),
    )
    conn.commit()
    cursor.close()
    conn.close()


def search_users_by_email(email_query: str, limit: int = 20) -> List[User]:
    """Search for users whose email contains the provided query string."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    like_value = f"%{email_query}%"
    cursor.execute(
        """
        SELECT UserID, Username, Email, PasswordHash, Role
        FROM `User`
        WHERE Email LIKE %s
        ORDER BY Email ASC
        LIMIT %s
        """,
        (like_value, limit),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [User.from_row(row) for row in rows]
