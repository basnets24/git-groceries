from typing import Optional, Dict

from db import get_db_connection


def insert_payment(
    order_id: int,
    provider: str,
    provider_ref: str,
    amount: float,
    status: str = "PENDING",
) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO Payment
            (ShoppingOrderID, Provider, ProviderRef, Amount, Status)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (order_id, provider, provider_ref, amount, status),
    )
    conn.commit()
    payment_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return payment_id


def fetch_payment_by_order_id(order_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT PaymentID, ShoppingOrderID, Status, ProviderRef
        FROM Payment
        WHERE ShoppingOrderID = %s
        ORDER BY PaymentID DESC
        LIMIT 1
        """,
        (order_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


def update_payment_status_by_provider_ref(provider_ref: str, status: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE Payment
        SET Status = %s
        WHERE ProviderRef = %s
        """,
        (status, provider_ref),
    )
    conn.commit()
    updated = cursor.rowcount > 0
    cursor.close()
    conn.close()
    return updated
