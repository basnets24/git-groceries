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
