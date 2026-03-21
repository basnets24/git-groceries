from typing import List, Optional

from db import get_db_connection
from models import CustomerAddress, CustomerPreference, CustomerProfile


def fetch_profile(user_id: int) -> Optional[CustomerProfile]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT UserID, DefaultAddressID, SubstitutionPreference, Notes, CreatedAt, UpdatedAt
        FROM CustomerProfile
        WHERE UserID = %s
        """,
        (user_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return CustomerProfile.from_row(row) if row else None


def create_profile(user_id: int) -> CustomerProfile:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO CustomerProfile (UserID)
        VALUES (%s)
        """,
        (user_id,),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return fetch_profile(user_id)


def update_profile(
    user_id: int,
    substitution_preference: Optional[str],
    notes: Optional[str],
    default_address_id: Optional[int],
) -> CustomerProfile:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE CustomerProfile
        SET SubstitutionPreference = %s,
            Notes = %s,
            DefaultAddressID = %s
        WHERE UserID = %s
        """,
        (substitution_preference, notes, default_address_id, user_id),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return fetch_profile(user_id)


def fetch_addresses(user_id: int) -> List[CustomerAddress]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT CustomerAddressID, UserID, Label, StreetLine1, StreetLine2,
               City, State, PostalCode, DeliveryInstructions, IsDefault,
               CreatedAt, UpdatedAt
        FROM CustomerAddress
        WHERE UserID = %s
        ORDER BY CreatedAt DESC
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [CustomerAddress.from_row(row) for row in rows]


def fetch_address(user_id: int, address_id: int) -> Optional[CustomerAddress]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT CustomerAddressID, UserID, Label, StreetLine1, StreetLine2,
               City, State, PostalCode, DeliveryInstructions, IsDefault,
               CreatedAt, UpdatedAt
        FROM CustomerAddress
        WHERE UserID = %s AND CustomerAddressID = %s
        """,
        (user_id, address_id),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return CustomerAddress.from_row(row) if row else None


def insert_address(
    user_id: int,
    label: str,
    street_line_1: str,
    street_line_2: Optional[str],
    city: str,
    state: str,
    postal_code: str,
    delivery_instructions: Optional[str],
    is_default: bool,
) -> CustomerAddress:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO CustomerAddress
            (UserID, Label, StreetLine1, StreetLine2, City, State, PostalCode,
             DeliveryInstructions, IsDefault)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            user_id,
            label,
            street_line_1,
            street_line_2,
            city,
            state,
            postal_code,
            delivery_instructions,
            is_default,
        ),
    )
    conn.commit()
    address_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return fetch_address(user_id, address_id)


def update_address(
    user_id: int,
    address_id: int,
    label: str,
    street_line_1: str,
    street_line_2: Optional[str],
    city: str,
    state: str,
    postal_code: str,
    delivery_instructions: Optional[str],
    is_default: bool,
) -> Optional[CustomerAddress]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE CustomerAddress
        SET Label = %s,
            StreetLine1 = %s,
            StreetLine2 = %s,
            City = %s,
            State = %s,
            PostalCode = %s,
            DeliveryInstructions = %s,
            IsDefault = %s
        WHERE UserID = %s AND CustomerAddressID = %s
        """,
        (
            label,
            street_line_1,
            street_line_2,
            city,
            state,
            postal_code,
            delivery_instructions,
            is_default,
            user_id,
            address_id,
        ),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return fetch_address(user_id, address_id)


def clear_default_address(user_id: int) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE CustomerAddress SET IsDefault = FALSE WHERE UserID = %s",
        (user_id,),
    )
    conn.commit()
    cursor.close()
    conn.close()


def set_default_address(user_id: int, address_id: int) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE CustomerAddress
        SET IsDefault = TRUE
        WHERE UserID = %s AND CustomerAddressID = %s
        """,
        (user_id, address_id),
    )
    conn.commit()
    cursor.close()
    conn.close()


def fetch_preferences(user_id: int) -> List[CustomerPreference]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT CustomerPreferenceID, UserID, PreferenceType, PreferenceValue,
               Source, CreatedAt, UpdatedAt
        FROM CustomerPreference
        WHERE UserID = %s
        ORDER BY CreatedAt DESC
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [CustomerPreference.from_row(row) for row in rows]


def delete_address(user_id: int, address_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        DELETE FROM CustomerAddress
        WHERE UserID = %s AND CustomerAddressID = %s
        """,
        (user_id, address_id),
    )
    conn.commit()
    deleted = cursor.rowcount > 0
    cursor.close()
    conn.close()
    return deleted
