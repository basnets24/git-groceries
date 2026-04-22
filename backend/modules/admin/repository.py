from typing import Dict, List, Optional

from db import get_db_connection


def fetch_all_orders() -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT
            so.ShoppingOrderID AS order_id,
            so.Status          AS status,
            COALESCE(
                NULLIF(so.Street, ''),
                (SELECT dt2.DestinationAddress
                 FROM TripStop ts2
                 JOIN DeliveryTrip dt2 ON ts2.DeliveryTripID = dt2.DeliveryTripID
                 WHERE ts2.ShoppingOrderID = so.ShoppingOrderID
                 ORDER BY dt2.DeliveryTripID DESC
                 LIMIT 1),
                ''
            ) AS Street,
            so.City, so.State, so.Zip,
            u.UserID           AS customer_id,
            u.Username         AS customer_username,
            u.Email            AS customer_email,
            SUM(soi.PriceAtCheckout * soi.Quantity)   AS subtotal,
            SUM(soi.WeightAtCheckout * soi.Quantity)  AS total_weight,
            MAX(p.OccurredAt)  AS order_date,
            MAX(p.Status)      AS payment_status,
            MAX(ts.DeliveryTripID) AS trip_id
        FROM ShoppingOrder so
        JOIN `User` u                   ON so.UserID = u.UserID
        LEFT JOIN ShoppingOrderItem soi ON so.ShoppingOrderID = soi.ShoppingOrderID
        LEFT JOIN Payment p             ON so.ShoppingOrderID = p.ShoppingOrderID
        LEFT JOIN TripStop ts           ON so.ShoppingOrderID = ts.ShoppingOrderID
        GROUP BY so.ShoppingOrderID
        ORDER BY so.ShoppingOrderID DESC
        """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    orders = []
    for row in rows:
        orders.append({
            "order_id": row["order_id"],
            "status": row["status"],
            "customer": {
                "customer_id": row["customer_id"],
                "username": row["customer_username"],
                "email": row["customer_email"],
            },
            "address": {
                "street": row["Street"],
                "city": row["City"],
                "state": row["State"],
                "zip": row["Zip"],
            },
            "subtotal": float(row["subtotal"]) if row["subtotal"] is not None else 0.0,
            "total_weight": float(row["total_weight"]) if row["total_weight"] is not None else 0.0,
            "order_date": row["order_date"].isoformat() if row["order_date"] else None,
            "payment_status": row["payment_status"],
            "trip_id": row["trip_id"],
        })
    return orders


def fetch_order_detail(order_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            so.ShoppingOrderID AS order_id,
            so.Status          AS status,
            COALESCE(
                NULLIF(so.Street, ''),
                (SELECT dt2.DestinationAddress
                 FROM TripStop ts2
                 JOIN DeliveryTrip dt2 ON ts2.DeliveryTripID = dt2.DeliveryTripID
                 WHERE ts2.ShoppingOrderID = so.ShoppingOrderID
                 ORDER BY dt2.DeliveryTripID DESC
                 LIMIT 1),
                ''
            ) AS Street,
            so.City, so.State, so.Zip,
            u.UserID AS customer_id, u.Username AS customer_username, u.Email AS customer_email
        FROM ShoppingOrder so
        JOIN `User` u ON so.UserID = u.UserID
        WHERE so.ShoppingOrderID = %s
        """,
        (order_id,),
    )
    row = cursor.fetchone()
    if not row:
        cursor.close()
        conn.close()
        return None

    cursor.execute(
        """
        SELECT
            p.ProductID        AS product_id,
            p.Name             AS name,
            pc.Name            AS category,
            soi.Quantity       AS quantity,
            soi.PriceAtCheckout  AS price_at_checkout,
            soi.WeightAtCheckout AS weight_at_checkout
        FROM ShoppingOrderItem soi
        JOIN Product p          ON soi.ProductID = p.ProductID
        JOIN ProductCategory pc ON p.ProductCategoryID = pc.ProductCategoryID
        WHERE soi.ShoppingOrderID = %s
        """,
        (order_id,),
    )
    item_rows = cursor.fetchall()
    items = [
        {
            "product_id": r["product_id"],
            "name": r["name"],
            "category": r["category"],
            "quantity": int(r["quantity"]),
            "price_at_checkout": float(r["price_at_checkout"]),
            "weight_at_checkout": float(r["weight_at_checkout"]),
        }
        for r in item_rows
    ]

    cursor.execute(
        """
        SELECT
            dt.DeliveryTripID    AS trip_id,
            dt.Status            AS trip_status,
            dt.Polyline          AS polyline,
            dt.OriginAddress     AS origin_address,
            dt.DestinationAddress AS destination_address,
            dt.OriginLat, dt.OriginLng, dt.DestLat, dt.DestLng,
            dt.DistanceM         AS distance_m,
            dt.DurationSec       AS duration_sec,
            dt.StartedAt         AS started_at,
            ts.StopIndex         AS stop_index,
            ts.ETA               AS eta
        FROM TripStop ts
        JOIN DeliveryTrip dt ON ts.DeliveryTripID = dt.DeliveryTripID
        WHERE ts.ShoppingOrderID = %s
        ORDER BY dt.StartedAt DESC
        LIMIT 1
        """,
        (order_id,),
    )
    trip_row = cursor.fetchone()
    cursor.close()
    conn.close()

    trip = None
    if trip_row:
        trip = {
            "trip_id": trip_row["trip_id"],
            "status": trip_row["trip_status"],
            "polyline": trip_row["polyline"],
            "origin": {
                "address": trip_row["origin_address"],
                "lat": float(trip_row["OriginLat"]) if trip_row["OriginLat"] is not None else None,
                "lng": float(trip_row["OriginLng"]) if trip_row["OriginLng"] is not None else None,
            },
            "destination": {
                "address": trip_row["destination_address"],
                "lat": float(trip_row["DestLat"]) if trip_row["DestLat"] is not None else None,
                "lng": float(trip_row["DestLng"]) if trip_row["DestLng"] is not None else None,
            },
            "distance_m": trip_row["distance_m"],
            "duration_sec": trip_row["duration_sec"],
            "started_at": trip_row["started_at"].isoformat() if trip_row["started_at"] else None,
            "stop_index": trip_row["stop_index"],
            "eta": trip_row["eta"].isoformat() if trip_row["eta"] else None,
        }

    return {
        "order_id": row["order_id"],
        "status": row["status"],
        "customer": {
            "customer_id": row["customer_id"],
            "username": row["customer_username"],
            "email": row["customer_email"],
        },
        "address": {
            "street": row["Street"],
            "city": row["City"],
            "state": row["State"],
            "zip": row["Zip"],
        },
        "items": items,
        "trip": trip,
    }
