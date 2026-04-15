from typing import List, Dict

from db import get_db_connection


def fetch_customer_orders(customer_id: int) -> List[Dict]:
    """Fetch all completed orders for a customer with items and payment info."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT
            so.ShoppingOrderID AS order_id,
            so.Status AS status,
            so.Street AS street,
            so.City AS city,
            so.State AS state,
            so.Zip AS zip,
            so.UserID AS customer_id,
            MAX(p.Amount) AS total_amount,
            MAX(p.Status) AS payment_status,
            MAX(p.OccurredAt) AS order_date,
            GROUP_CONCAT(DISTINCT
                CONCAT(
                    soi.Quantity, 'x ',
                    prod.Name, ' (',
                    FORMAT(soi.WeightAtCheckout, 1), ' lbs each)'
                )
                SEPARATOR '; '
            ) AS items_summary
        FROM ShoppingOrder so
        LEFT JOIN Payment p ON so.ShoppingOrderID = p.ShoppingOrderID
        LEFT JOIN ShoppingOrderItem soi ON so.ShoppingOrderID = soi.ShoppingOrderID
        LEFT JOIN Product prod ON soi.ProductID = prod.ProductID
        WHERE so.UserID = %s AND so.Status = 'COMPLETED'
        GROUP BY so.ShoppingOrderID
        ORDER BY so.ShoppingOrderID DESC
        """,
        (customer_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # Process the results
    orders = []
    for row in rows:
        # Parse items summary
        items_summary = row.get("items_summary", "")
        items = []
        if items_summary:
            for item_str in items_summary.split("; "):
                if "x " in item_str:
                    qty_part, rest = item_str.split("x ", 1)
                    qty = int(qty_part.strip())
                    name_part, weight_part = rest.rsplit(" (", 1)
                    weight = weight_part.rstrip(")")
                    items.append({
                        "quantity": qty,
                        "name": name_part.strip(),
                        "weight": weight
                    })

        orders.append({
            "order_id": row["order_id"],
            "status": row["status"],
            "address": {
                "street": row["street"],
                "city": row["city"],
                "state": row["state"],
                "zip": row["zip"]
            },
            "total_amount": float(row["total_amount"]) if row["total_amount"] else 0.0,
            "payment_status": row["payment_status"],
            "order_date": row["order_date"].isoformat() if row["order_date"] else None,
            "items": items
        })

    return orders