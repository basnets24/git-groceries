import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import mysql.connector

from db import get_db_connection
from exceptions import ServiceError, ValidationError
from integrations.google_maps.client import GoogleMapsClient, GoogleMapsConfig
from .delivery_planner import can_add

config = GoogleMapsConfig(api_key=os.getenv("GOOGLE_MAPS_API_KEY"))
client = GoogleMapsClient(config)

ROBOT_ORIGIN_ADDRESS = (
    "San Jose State University Charles W. Davidson College of Engineering, "
    "1 Washington Sq, San Jose, CA 95192"
)
SIMULATED_TRIP_DURATION_SEC = 60


def start_simulated_delivery(order_id: int, address: str, customer_id: Optional[int] = None) -> Dict:
    if not address or not address.strip():
        raise ValidationError("Delivery address is required")

    directions = client.get_directions(ROBOT_ORIGIN_ADDRESS, address.strip())
    if directions.get("status") != "OK":
        raise ServiceError(
            f"Unable to compute delivery route ({directions.get('status')})"
        )

    origin = directions["origin"]
    destination = directions["destination"]

    db_trip_id = _persist_trip(
        order_id=order_id,
        polyline=directions["encoded_polyline"],
        origin_address=ROBOT_ORIGIN_ADDRESS,
        dest_address=address.strip(),
        origin_lat=origin.get("lat"),
        origin_lng=origin.get("lng"),
        dest_lat=destination.get("lat"),
        dest_lng=destination.get("lng"),
        distance_m=directions["distance_m"],
        duration_sec=directions["duration_sec"],
    )

    if db_trip_id is None:
        raise ServiceError("Failed to persist delivery trip to database")

    return {
        "trip_id": db_trip_id,
        "order_id": order_id,
        "polyline": directions["encoded_polyline"],
        "origin": origin,
        "destination": destination,
        "total_duration_sec": SIMULATED_TRIP_DURATION_SEC,
        "real_duration_sec": directions["duration_sec"],
        "distance_m": directions["distance_m"],
    }


def _persist_trip(
    order_id: int,
    polyline: str,
    origin_address: str,
    dest_address: str,
    origin_lat: Optional[float],
    origin_lng: Optional[float],
    dest_lat: Optional[float],
    dest_lng: Optional[float],
    distance_m: int,
    duration_sec: int,
) -> Optional[int]:
    """Insert a DeliveryTrip + TripStop row. Returns the new trip id, or None on failure."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO DeliveryTrip (
                Status, Polyline,
                OriginAddress, DestinationAddress,
                OriginLat, OriginLng, DestLat, DestLng,
                DistanceM, DurationSec
            ) VALUES ('INPROGRESS', %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                polyline,
                origin_address,
                dest_address,
                origin_lat,
                origin_lng,
                dest_lat,
                dest_lng,
                distance_m,
                duration_sec,
            ),
        )
        trip_id = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO TripStop (DeliveryTripID, ShoppingOrderID, StopIndex, ETA)
            VALUES (%s, %s, %s, %s)
            """,
            (trip_id, order_id, 0, datetime.now() + timedelta(seconds=duration_sec)),
        )
        cursor.execute(
            "UPDATE ShoppingOrder SET Street = %s WHERE ShoppingOrderID = %s",
            (dest_address, order_id),
        )
        conn.commit()
        cursor.close()
        conn.close()
        return trip_id
    except Exception:
        return None


def get_db():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DATABASE"),
    )

def fetch_orders():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            so.ShoppingOrderID AS id,
            CONCAT(ca.StreetLine1, ', ', ca.City, ', ', ca.State, ' ', ca.PostalCode) AS address,
            SUM(soi.WeightAtCheckout * soi.Quantity) AS weight
        FROM ShoppingOrder so
        JOIN ShoppingOrderItem soi ON so.ShoppingOrderID = soi.ShoppingOrderID
        JOIN CustomerProfile cp ON so.UserID = cp.UserID
        JOIN CustomerAddress ca ON cp.DefaultAddressID = ca.CustomerAddressID
        WHERE so.Status = 'COMPLETED'
          AND so.ReadyForDispatchAt IS NOT NULL
        GROUP BY so.ShoppingOrderID
    """)

    orders = cursor.fetchall()
    cursor.close()
    conn.close()

    return orders

def dispatch_orders():
    orders = fetch_orders()

    trips = []
    current_trip = []
    current_weight = 0

    conn = get_db()
    cursor = conn.cursor()

    for order in orders:

        if not can_add(current_trip, current_weight, order["weight"]):
            trips.append((current_trip, current_weight))
            current_trip = []
            current_weight = 0

        current_trip.append(order)
        current_weight += order["weight"]

    if current_trip:
        trips.append((current_trip, current_weight))


    results = []

    for trip_orders, trip_weight in trips:

        addresses = [o["address"] for o in trip_orders]

        origin = addresses[0]
        waypoints = addresses[1:-1] if len(addresses) > 2 else []
        destination = addresses[-1]

        route = client.optimize_route(origin, waypoints, destination)

        if route.get("status") != "OK":
            continue

        legs = route.get("legs", [])
        total_distance_m = sum(leg.get("distance", {}).get("value", 0) for leg in legs)
        total_duration_sec = sum(leg.get("duration", {}).get("value", 0) for leg in legs)

        origin_loc = legs[0].get("start_location", {}) if legs else {}
        dest_loc = legs[-1].get("end_location", {}) if legs else {}

        cursor.execute("""
            INSERT INTO DeliveryTrip (
                Status, Polyline, OriginAddress, DestinationAddress,
                OriginLat, OriginLng, DestLat, DestLng,
                DistanceM, DurationSec
            )
            VALUES ('INPROGRESS', %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            route.get("overview_polyline"),
            origin,
            destination,
            origin_loc.get("lat"),
            origin_loc.get("lng"),
            dest_loc.get("lat"),
            dest_loc.get("lng"),
            total_distance_m,
            total_duration_sec,
        ))
        trip_id = cursor.lastrowid

        now = datetime.now()
        current_time = now

        for i, order in enumerate(trip_orders):

            if i < len(legs):
                duration_sec = legs[i].get("duration", {}).get("value", 600)
                travel_minutes = duration_sec // 60
            else:
                travel_minutes = 10

            current_time += timedelta(minutes=travel_minutes)

            cursor.execute("""
                INSERT INTO TripStop (
                    DeliveryTripID,
                    ShoppingOrderID,
                    StopIndex,
                    ETA
                )
                VALUES (%s, %s, %s, %s)
            """, (
                trip_id,
                order["id"],
                i,
                current_time
            ))

            cursor.execute("""
                UPDATE ShoppingOrder
                SET Status = 'INPROGRESS'
                WHERE ShoppingOrderID = %s
            """, (order["id"],))

        results.append({
            "trip_id": trip_id,
            "weight": trip_weight,
            "route": route,
            "orders": trip_orders
        })

    conn.commit()
    cursor.close()
    conn.close()

    return {"trips": results}


def _calc_progress(started_at: Optional[datetime], duration_sec: int, finished: bool):
    if finished:
        return 1.0, 0
    if not started_at or duration_sec <= 0:
        return 0.0, duration_sec
    elapsed = (datetime.now() - started_at).total_seconds()
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
            stop_eta is not None and datetime.now() >= stop_eta
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


def get_trip_status(trip_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT Status, DurationSec, StartedAt
        FROM DeliveryTrip
        WHERE DeliveryTripID = %s
        """,
        (trip_id,),
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
