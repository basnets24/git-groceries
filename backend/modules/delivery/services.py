import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from db import get_db_connection
from exceptions import ValidationError
from integrations.google_maps.client import GoogleMapsClient, GoogleMapsConfig
from .geo import DELIVERY_RADIUS_MILES, ORIGIN_LAT, ORIGIN_LNG, haversine_miles

config = GoogleMapsConfig(api_key=os.getenv("GOOGLE_MAPS_API_KEY"))
client = GoogleMapsClient(config)

ROBOT_ORIGIN_ADDRESS = (
    "San Jose State University Charles W. Davidson College of Engineering, "
    "1 Washington Sq, San Jose, CA 95192"
)


def validate_delivery_zone(address: str) -> None:
    """Raise ValidationError if address is outside the 18-mile service area."""
    geo = client.geocode(address)
    if geo.get("status") != "OK" or geo.get("lat") is None:
        raise ValidationError("Unable to verify delivery address location")
    distance = haversine_miles(ORIGIN_LAT, ORIGIN_LNG, geo["lat"], geo["lng"])
    if distance > DELIVERY_RADIUS_MILES:
        raise ValidationError(
            f"Delivery address is outside our {DELIVERY_RADIUS_MILES}-mile service area"
        )



def _calc_progress(started_at: Optional[datetime], duration_sec: int, finished: bool):
    if finished:
        return 1.0, 0
    if not started_at or duration_sec <= 0:
        return 0.0, duration_sec
    elapsed = (datetime.utcnow() - started_at).total_seconds()
    progress = max(0.0, min(1.0, elapsed / duration_sec))
    eta_sec = max(0, int(duration_sec - elapsed))
    return progress, eta_sec


def list_customer_deliveries(customer_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT
            dt.DeliveryTripID     AS trip_id,
            dt.Status             AS trip_status,
            dt.Polyline           AS polyline,
            dt.OriginAddress      AS origin_address,
            dt.OriginLat          AS origin_lat,
            dt.OriginLng          AS origin_lng,
            dt.DistanceM          AS distance_m,
            dt.DurationSec        AS duration_sec,
            dt.StartedAt          AS started_at,
            ts.ShoppingOrderID    AS order_id,
            ts.ETA                AS stop_eta,
            COALESCE(NULLIF(so.Street, ''), ca.StreetLine1, '') AS stop_street,
            COALESCE(NULLIF(so.City,   ''), ca.City,        '') AS stop_city,
            COALESCE(NULLIF(so.State,  ''), ca.State,       '') AS stop_state,
            COALESCE(NULLIF(so.Zip,    ''), ca.PostalCode,  '') AS stop_zip
        FROM DeliveryTrip dt
        JOIN TripStop ts ON dt.DeliveryTripID = ts.DeliveryTripID
        JOIN ShoppingOrder so ON ts.ShoppingOrderID = so.ShoppingOrderID
        LEFT JOIN CustomerProfile cp ON cp.UserID = so.UserID
        LEFT JOIN CustomerAddress ca ON ca.CustomerAddressID = cp.DefaultAddressID
        WHERE so.UserID = %s
        ORDER BY dt.DeliveryTripID DESC
        """,
        (customer_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    seen = set()
    trips = []
    for row in rows:
        if row["trip_id"] in seen:
            continue
        seen.add(row["trip_id"])

        stop_address = ", ".join(
            p for p in [
                row.get("stop_street"), row.get("stop_city"),
                row.get("stop_state"), row.get("stop_zip"),
            ] if p
        )

        dest_lat: float = 0.0
        dest_lng: float = 0.0
        # Fall back to full-trip values if per-stop directions fail.
        trip_polyline = row["polyline"] or ""
        trip_duration_sec = row["duration_sec"] or 0
        trip_distance_m = row["distance_m"] or 0

        if stop_address:
            geo = client.geocode(stop_address)
            if geo.get("status") == "OK":
                dest_lat = float(geo.get("lat", 0.0))
                dest_lng = float(geo.get("lng", 0.0))

            # direct route from origin to this customer's stop 
            stop_dirs = client.get_directions(ROBOT_ORIGIN_ADDRESS, stop_address.strip())
            if stop_dirs.get("status") == "OK":
                trip_polyline = stop_dirs.get("encoded_polyline", trip_polyline)
                trip_duration_sec = stop_dirs.get("duration_sec", trip_duration_sec)
                trip_distance_m = stop_dirs.get("distance_m", trip_distance_m)

        # robot ETA is based on specific stop, not the whole trip
        stop_eta = row.get("stop_eta")
        started_at = row["started_at"]
        if stop_eta and started_at:
            stop_duration_sec = max(1, int((stop_eta - started_at).total_seconds()))
        else:
            stop_duration_sec = trip_duration_sec

        finished = (row["trip_status"] == "COMPLETED") or (
            stop_eta is not None and datetime.utcnow() >= stop_eta
        )
        progress, eta_sec = _calc_progress(started_at, stop_duration_sec, finished)
        if progress >= 1.0:
            finished = True

        trips.append({
            "trip_id": row["trip_id"],
            "order_id": row["order_id"],
            "polyline": trip_polyline,
            "origin": {
                "lat": float(row["origin_lat"]) if row["origin_lat"] else 0,
                "lng": float(row["origin_lng"]) if row["origin_lng"] else 0,
                "address": row["origin_address"] or "",
            },
            "destination": {
                "lat": dest_lat,
                "lng": dest_lng,
                "address": stop_address,
            },
            "total_duration_sec": stop_duration_sec,
            "real_duration_sec": trip_duration_sec,
            "distance_m": trip_distance_m,
            "progress": progress,
            "eta_sec": eta_sec,
            "finished": finished,
            "started_at": started_at.timestamp() if started_at else 0,
        })
    return trips


def list_pending_dispatch_orders(customer_id: int) -> List[Dict]:
    """Return PAID orders that have not yet been assigned to a delivery trip."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT
            so.ShoppingOrderID AS order_id,
            COALESCE(NULLIF(so.Street, ''), ca.StreetLine1, '') AS street,
            COALESCE(NULLIF(so.City,   ''), ca.City,        '') AS city,
            COALESCE(NULLIF(so.State,  ''), ca.State,       '') AS state,
            COALESCE(NULLIF(so.Zip,    ''), ca.PostalCode,  '') AS zip
        FROM ShoppingOrder so
        LEFT JOIN CustomerProfile cp ON cp.UserID = so.UserID
        LEFT JOIN CustomerAddress ca ON ca.CustomerAddressID = cp.DefaultAddressID
        WHERE so.UserID = %s
          AND so.Status = 'PAID'
          AND so.ReadyForDispatchAt IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM TripStop ts WHERE ts.ShoppingOrderID = so.ShoppingOrderID
          )
        ORDER BY so.ReadyForDispatchAt ASC
        """,
        (customer_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    result = []
    for row in rows:
        address = ", ".join(p for p in [row["street"], row["city"], row["state"], row["zip"]] if p)
        result.append({"order_id": row["order_id"], "address": address})
    return result


def complete_trip(trip_id: int, order_id: int, customer_id: int) -> None:
    """Mark a specific order as DELIVERED. Closes the trip and returns the robot once all orders are delivered."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT 1 FROM TripStop ts
            JOIN ShoppingOrder so ON so.ShoppingOrderID = ts.ShoppingOrderID
            WHERE ts.DeliveryTripID = %s AND ts.ShoppingOrderID = %s AND so.UserID = %s
            """,
            (trip_id, order_id, customer_id),
        )
        if not cursor.fetchone():
            raise ValidationError("Order does not belong to this trip")
        cursor.execute(
            "UPDATE ShoppingOrder SET Status = 'DELIVERED' WHERE ShoppingOrderID = %s",
            (order_id,),
        )
        # Close the trip only when every stop on it is now DELIVERED
        cursor.execute(
            """
            UPDATE DeliveryTrip dt
            SET dt.Status = 'COMPLETED'
            WHERE dt.DeliveryTripID = %s
              AND NOT EXISTS (
                  SELECT 1
                  FROM TripStop ts
                  JOIN ShoppingOrder so ON so.ShoppingOrderID = ts.ShoppingOrderID
                  WHERE ts.DeliveryTripID = %s
                    AND so.Status != 'DELIVERED'
              )
            """,
            (trip_id, trip_id),
        )
        if cursor.rowcount == 1:
            # Trip just closed — robot starts returning to base
            cursor.execute(
                "SELECT DurationSec FROM DeliveryTrip WHERE DeliveryTripID = %s",
                (trip_id,),
            )
            row = cursor.fetchone()
            duration_sec = (row or {}).get("DurationSec") or 600
            cursor.execute(
                """
                UPDATE Robot
                SET Status = 'RETURNING',
                    ReturnETA = DATE_ADD(NOW(), INTERVAL %s SECOND)
                WHERE CurrentTripID = %s
                """,
                (duration_sec, trip_id),
            )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def get_trip_status(trip_id: int, customer_id: Optional[int]) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    if customer_id is None:
        cursor.execute(
            """
            SELECT Status, DurationSec, StartedAt
            FROM DeliveryTrip
            WHERE DeliveryTripID = %s
            """,
            (trip_id,),
        )
    else:
        cursor.execute(
            """
            SELECT dt.Status, dt.DurationSec, dt.StartedAt
            FROM DeliveryTrip dt
            JOIN TripStop ts ON ts.DeliveryTripID = dt.DeliveryTripID
            JOIN ShoppingOrder so ON so.ShoppingOrderID = ts.ShoppingOrderID
            WHERE dt.DeliveryTripID = %s AND so.UserID = %s
            LIMIT 1
            """,
            (trip_id, customer_id),
        )
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if row is None:
        return None

    finished = row["Status"] == "COMPLETED"
    duration_sec = row["DurationSec"] or 0
    progress, eta_sec = _calc_progress(row["StartedAt"], duration_sec, finished)
    if progress >= 1.0:
        finished = True

    return {
        "trip_id": trip_id,
        "progress": progress,
        "eta_sec": eta_sec,
        "finished": finished,
    }
