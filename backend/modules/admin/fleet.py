"""Admin fleet + dispatch services.

Exposes helpers the admin routes use to:
  * list the 10-robot fleet with current positions,
  * list orders waiting to be dispatched (with geocoded lat/lng),
  * confirm a dispatch plan the admin composed in the UI, and
  * auto-dispatch any order that has waited longer than the grace window.

The Google Maps waypoint-optimizer is used to compute the shortest
multi-stop route for every trip.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional, Tuple

from db import get_db_connection
from exceptions import ConflictError, NotFoundError, ServiceError, ValidationError
from integrations.google_maps.client import GoogleMapsClient, GoogleMapsConfig

ROBOT_ORIGIN_ADDRESS = (
    "San Jose State University Charles W. Davidson College of Engineering, "
    "1 Washington Sq, San Jose, CA 95192"
)
ROBOT_ORIGIN_LAT = 37.3352
ROBOT_ORIGIN_LNG = -121.8811

# How long a paid order may sit in the pending queue before an admin must
# confirm it. After this window the auto-dispatch endpoint may claim it.
AUTO_DISPATCH_AFTER_SEC = 5 * 60

FLEET_SIZE = 10
MAX_ORDERS_PER_TRIP = 10
MAX_WEIGHT_LBS = 200.0


_client = GoogleMapsClient(GoogleMapsConfig(api_key=os.getenv("GOOGLE_MAPS_API_KEY")))


def _format_address(street: str, city: str, state: str, zip_code: str) -> str:
    parts = [p for p in (street, city, state, zip_code) if p]
    return ", ".join(parts)

def complete_finished_trips() -> int:
    #Reset robots to idle and mark trips completed once their trips finish
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Reset any robot whose current trip has run past its duration.
        cursor.execute(
            """
            UPDATE Robot r
            JOIN DeliveryTrip dt ON dt.DeliveryTripID = r.CurrentTripID
            SET r.Status        = 'IDLE',
                r.CurrentTripID = NULL,
                r.CurrentLat    = %s,
                r.CurrentLng    = %s
            WHERE dt.Status = 'INPROGRESS'
              AND dt.StartedAt IS NOT NULL
              AND DATE_ADD(dt.StartedAt, INTERVAL dt.DurationSec SECOND) <= NOW()
            """,
            (ROBOT_ORIGIN_LAT, ROBOT_ORIGIN_LNG),
        )
        # Mark DISPATCHED orders as DELIVERED on trips whose full duration has elapsed
        cursor.execute(
            """
            UPDATE ShoppingOrder so
            JOIN TripStop ts ON ts.ShoppingOrderID = so.ShoppingOrderID
            JOIN DeliveryTrip dt ON dt.DeliveryTripID = ts.DeliveryTripID
            SET so.Status = 'DELIVERED'
            WHERE dt.Status = 'INPROGRESS'
              AND dt.StartedAt IS NOT NULL
              AND dt.DurationSec IS NOT NULL
              AND DATE_ADD(dt.StartedAt, INTERVAL dt.DurationSec SECOND) <= NOW()
              AND so.Status = 'DISPATCHED'
            """
        )
        # Mark all elapsed INPROGRESS trips COMPLETED
        cursor.execute(
            """
            UPDATE DeliveryTrip
            SET Status = 'COMPLETED'
            WHERE Status = 'INPROGRESS'
              AND StartedAt IS NOT NULL
              AND DurationSec IS NOT NULL
              AND DATE_ADD(StartedAt, INTERVAL DurationSec SECOND) <= NOW()
            """
        )
        count = cursor.rowcount
        # Transition RETURNING robots to IDLE once they've arrived back at base
        cursor.execute(
            """
            UPDATE Robot
            SET Status = 'IDLE',
                CurrentTripID = NULL,
                ReturnETA = NULL,
                CurrentLat = %s,
                CurrentLng = %s
            WHERE Status = 'RETURNING'
              AND ReturnETA IS NOT NULL
              AND ReturnETA <= NOW()
            """,
            (ROBOT_ORIGIN_LAT, ROBOT_ORIGIN_LNG),
        )
        conn.commit()
        return count
    finally:
        cursor.close()
        conn.close()


def fetch_trip(trip_id: int) -> Optional[Dict]:
    """Return full trip detail in the same shape confirm_dispatch returns."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                dt.DeliveryTripID  AS trip_id,
                dt.RobotID         AS robot_id,
                dt.Polyline        AS polyline,
                dt.DistanceM       AS distance_m,
                dt.DurationSec     AS duration_sec,
                dt.StartedAt       AS started_at
            FROM DeliveryTrip dt
            WHERE dt.DeliveryTripID = %s
            """,
            (trip_id,),
        )
        trip_row = cursor.fetchone()
        if trip_row is None:
            return None

        cursor.execute(
            """
            SELECT
                ts.StopIndex    AS stop_index,
                ts.ShoppingOrderID AS order_id,
                ts.ETA          AS eta,
                COALESCE(NULLIF(so.Street,''), ca.StreetLine1, '') AS street,
                COALESCE(NULLIF(so.City,  ''), ca.City,        '') AS city,
                COALESCE(NULLIF(so.State, ''), ca.State,       '') AS state,
                COALESCE(NULLIF(so.Zip,   ''), ca.PostalCode,  '') AS zip
            FROM TripStop ts
            JOIN ShoppingOrder so ON so.ShoppingOrderID = ts.ShoppingOrderID
            LEFT JOIN CustomerProfile cp ON cp.UserID = so.UserID
            LEFT JOIN CustomerAddress ca ON ca.CustomerAddressID = cp.DefaultAddressID
            WHERE ts.DeliveryTripID = %s
            ORDER BY ts.StopIndex ASC
            """,
            (trip_id,),
        )
        stop_rows = cursor.fetchall()

        started_at = trip_row["started_at"]
        stops = []
        prev_eta = started_at
        for row in stop_rows:
            eta = row["eta"]
            leg_sec = int((eta - prev_eta).total_seconds()) if eta and prev_eta else 600
            prev_eta = eta
            address = ", ".join(p for p in [row["street"], row["city"], row["state"], row["zip"]] if p)
            stops.append({
                "stop_index": row["stop_index"],
                "order_id": row["order_id"],
                "address": address,
                "eta": (eta.isoformat() + "Z") if eta else None,
                "leg_duration_sec": leg_sec,
            })

        return {
            "trip_id": trip_row["trip_id"],
            "robot_id": trip_row["robot_id"],
            "polyline": trip_row["polyline"],
            "distance_m": trip_row["distance_m"] or 0,
            "duration_sec": trip_row["duration_sec"] or 0,
            "stops": stops,
        }
    finally:
        cursor.close()
        conn.close()


def list_fleet() -> List[Dict]:
    """Return every robot with its current location + status."""
    complete_finished_trips()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT
            r.RobotID        AS robot_id,
            r.Label          AS label,
            r.Status         AS status,
            r.CurrentLat     AS lat,
            r.CurrentLng     AS lng,
            r.CurrentTripID  AS trip_id,
            r.UpdatedAt      AS updated_at
        FROM Robot r
        ORDER BY r.RobotID ASC
        """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "robot_id": row["robot_id"],
            "label": row["label"],
            "status": row["status"],
            "lat": float(row["lat"]),
            "lng": float(row["lng"]),
            "trip_id": row["trip_id"],
            "updated_at": row["updated_at"].isoformat() + "Z" if row["updated_at"] else None,
        }
        for row in rows
    ]


def _fetch_pending_rows() -> List[Dict]:
    """Raw DB rows for orders that are paid but have no TripStop yet."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT
            so.ShoppingOrderID AS order_id,
            so.Status          AS status,
            so.ReadyForDispatchAt AS ready_at,
            u.UserID           AS customer_id,
            u.Username         AS customer_username,
            u.Email            AS customer_email,
            COALESCE(NULLIF(so.Street, ''), ca.StreetLine1, '') AS street,
            COALESCE(NULLIF(so.City,   ''), ca.City,        '') AS city,
            COALESCE(NULLIF(so.State,  ''), ca.State,       '') AS state,
            COALESCE(NULLIF(so.Zip,    ''), ca.PostalCode,  '') AS zip,
            SUM(soi.WeightAtCheckout * soi.Quantity) AS total_weight,
            SUM(soi.PriceAtCheckout  * soi.Quantity) AS subtotal
        FROM ShoppingOrder so
        JOIN `User` u                    ON so.UserID = u.UserID
        LEFT JOIN CustomerProfile cp     ON cp.UserID = u.UserID
        LEFT JOIN CustomerAddress ca     ON ca.CustomerAddressID = cp.DefaultAddressID
        LEFT JOIN ShoppingOrderItem soi  ON soi.ShoppingOrderID = so.ShoppingOrderID
        LEFT JOIN TripStop ts            ON ts.ShoppingOrderID  = so.ShoppingOrderID
        WHERE so.Status = 'PAID' AND ts.ShoppingOrderID IS NULL
        GROUP BY so.ShoppingOrderID
        ORDER BY so.ReadyForDispatchAt ASC, so.ShoppingOrderID ASC
        """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows


def list_pending_orders() -> List[Dict]:
    """Pending-dispatch orders + geocoded coordinates for the admin map."""
    rows = _fetch_pending_rows()
    out: List[Dict] = []
    now = datetime.utcnow()

    for row in rows:
        address = _format_address(
            row["street"], row["city"], row["state"], row["zip"]
        )
        lat: Optional[float] = None
        lng: Optional[float] = None
        geocode_status = "NO_ADDRESS"
        if address:
            geo = _client.geocode(address)
            geocode_status = geo.get("status", "UNKNOWN")
            if geocode_status == "OK":
                lat = geo.get("lat")
                lng = geo.get("lng")

        ready_at: Optional[datetime] = row["ready_at"]
        seconds_since_ready: Optional[int] = None
        seconds_until_auto: Optional[int] = None
        if ready_at is not None:
            elapsed = (now - ready_at).total_seconds()
            seconds_since_ready = max(0, int(elapsed))
            seconds_until_auto = max(0, int(AUTO_DISPATCH_AFTER_SEC - elapsed))

        out.append(
            {
                "order_id": row["order_id"],
                "status": row["status"],
                "customer": {
                    "customer_id": row["customer_id"],
                    "username": row["customer_username"],
                    "email": row["customer_email"],
                },
                "address": {
                    "street": row["street"],
                    "city": row["city"],
                    "state": row["state"],
                    "zip": row["zip"],
                    "formatted": address,
                    "lat": lat,
                    "lng": lng,
                    "geocode_status": geocode_status,
                },
                "total_weight": float(row["total_weight"] or 0.0),
                "subtotal": float(row["subtotal"] or 0.0),
                "ready_at": ready_at.isoformat() + "Z" if ready_at else None,
                "seconds_since_ready": seconds_since_ready,
                "seconds_until_auto_dispatch": seconds_until_auto,
                "auto_dispatch_ready": (
                    seconds_until_auto is not None and seconds_until_auto <= 0
                ),
            }
        )
    return out


def _fetch_orders_by_id(
    cursor, order_ids: Iterable[int]
) -> List[Dict]:
    ids = list(order_ids)
    if not ids:
        return []
    placeholders = ",".join(["%s"] * len(ids))
    cursor.execute(
        f"""
        SELECT
            so.ShoppingOrderID AS order_id,
            so.Status          AS status,
            COALESCE(NULLIF(so.Street, ''), ca.StreetLine1, '') AS street,
            COALESCE(NULLIF(so.City,   ''), ca.City,        '') AS city,
            COALESCE(NULLIF(so.State,  ''), ca.State,       '') AS state,
            COALESCE(NULLIF(so.Zip,    ''), ca.PostalCode,  '') AS zip,
            SUM(soi.WeightAtCheckout * soi.Quantity) AS total_weight
        FROM ShoppingOrder so
        JOIN `User` u                   ON so.UserID = u.UserID
        LEFT JOIN CustomerProfile cp    ON cp.UserID = u.UserID
        LEFT JOIN CustomerAddress ca    ON ca.CustomerAddressID = cp.DefaultAddressID
        LEFT JOIN ShoppingOrderItem soi ON soi.ShoppingOrderID = so.ShoppingOrderID
        WHERE so.ShoppingOrderID IN ({placeholders})
        GROUP BY so.ShoppingOrderID
        """,
        tuple(ids),
    )
    return cursor.fetchall()


def _already_assigned(cursor, order_ids: Iterable[int]) -> List[int]:
    ids = list(order_ids)
    if not ids:
        return []
    placeholders = ",".join(["%s"] * len(ids))
    cursor.execute(
        f"""
        SELECT DISTINCT ShoppingOrderID
        FROM TripStop
        WHERE ShoppingOrderID IN ({placeholders})
        """,
        tuple(ids),
    )
    return [row[0] for row in cursor.fetchall()]


def _robot_is_available(cursor, robot_id: int) -> bool:
    cursor.execute(
        "SELECT Status FROM Robot WHERE RobotID = %s",
        (robot_id,),
    )
    row = cursor.fetchone()
    if row is None:
        return False
    status = row[0] if isinstance(row, tuple) else row.get("Status")
    return status == "IDLE"


def _build_trip(
    cursor,
    robot_id: int,
    order_rows: List[Dict],
) -> Dict:
    """Compute shortest route, persist DeliveryTrip + TripStops, return summary."""
    addresses = [
        _format_address(o["street"], o["city"], o["state"], o["zip"])
        for o in order_rows
    ]
    missing = [o["order_id"] for o, a in zip(order_rows, addresses) if not a]
    if missing:
        raise ValidationError(
            "One or more orders are missing a delivery address",
            extra={"order_ids": missing},
        )

    waypoints = addresses[:-1] if len(addresses) > 1 else []
    final_destination = addresses[-1]

    route = _client.optimize_route(
        origin=ROBOT_ORIGIN_ADDRESS,
        waypoints=waypoints,
        destination=final_destination,
    )
    if route.get("status") != "OK":
        raise ServiceError(
            f"Google Maps could not compute a route ({route.get('status')})"
        )

    legs = route.get("legs", [])
    # Google returns the waypoint-optimized indices for the middle stops only.
    # Put the final address at the end so the ordering matches legs/addresses.
    waypoint_order: List[int] = list(route.get("waypoint_order", []))
    optimized_order_indices: List[int] = waypoint_order + [len(addresses) - 1]
    # Safety: if the API returned a single leg (1-stop trip), just use the
    # single order.
    if len(addresses) == 1:
        optimized_order_indices = [0]

    total_distance_m = sum(
        leg.get("distance", {}).get("value", 0) for leg in legs
    )
    total_duration_sec = sum(
        (
            leg.get("duration_in_traffic", leg.get("duration", {})).get(
                "value", 0
            )
            if isinstance(
                leg.get("duration_in_traffic", leg.get("duration", {})), dict
            )
            else 0
        )
        for leg in legs
    )

    cursor.execute(
        """
        INSERT INTO DeliveryTrip (
            RobotID, Status, Polyline,
            OriginAddress, DestinationAddress,
            OriginLat, OriginLng,
            DistanceM, DurationSec,
            StartedAt, ConfirmedAt
        ) VALUES (%s, 'INPROGRESS', %s, %s, %s, %s, %s, %s, %s,
                  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """,
        (
            robot_id,
            route.get("overview_polyline"),
            ROBOT_ORIGIN_ADDRESS,
            final_destination,
            ROBOT_ORIGIN_LAT,
            ROBOT_ORIGIN_LNG,
            total_distance_m,
            total_duration_sec,
        ),
    )
    trip_id = cursor.lastrowid

    now = datetime.utcnow()
    running_eta = now
    stop_payload: List[Dict] = []
    for stop_index, original_index in enumerate(optimized_order_indices):
        order = order_rows[original_index]
        leg = legs[stop_index] if stop_index < len(legs) else None
        leg_duration_sec = 600
        if leg is not None:
            duration_block = leg.get("duration_in_traffic", leg.get("duration", {}))
            if isinstance(duration_block, dict):
                leg_duration_sec = duration_block.get("value", 600)
        running_eta = running_eta + timedelta(seconds=leg_duration_sec)

        cursor.execute(
            """
            INSERT INTO TripStop (DeliveryTripID, ShoppingOrderID, StopIndex, ETA)
            VALUES (%s, %s, %s, %s)
            """,
            (trip_id, order["order_id"], stop_index, running_eta),
        )
        stop_payload.append(
            {
                "stop_index": stop_index,
                "order_id": order["order_id"],
                "address": _format_address(
                    order["street"], order["city"], order["state"], order["zip"]
                ),
                "eta": running_eta.isoformat() + "Z",
                "leg_duration_sec": leg_duration_sec,
            }
        )

    cursor.execute(
        """
        UPDATE Robot
        SET Status = 'DISPATCHED', CurrentTripID = %s
        WHERE RobotID = %s
        """,
        (trip_id, robot_id),
    )

    order_ids_in_trip = [o["order_id"] for o in order_rows]
    placeholders = ",".join(["%s"] * len(order_ids_in_trip))
    cursor.execute(
        f"UPDATE ShoppingOrder SET Status = 'DISPATCHED' WHERE ShoppingOrderID IN ({placeholders})",
        tuple(order_ids_in_trip),
    )

    return {
        "trip_id": trip_id,
        "robot_id": robot_id,
        "polyline": route.get("overview_polyline"),
        "distance_m": total_distance_m,
        "duration_sec": total_duration_sec,
        "stops": stop_payload,
    }


def _validate_group(group: Dict) -> Tuple[int, List[int]]:
    if not isinstance(group, dict):
        raise ValidationError("Each group must be an object")
    robot_id = group.get("robot_id")
    order_ids = group.get("order_ids")
    if not isinstance(robot_id, int):
        raise ValidationError("group.robot_id must be an integer")
    if not isinstance(order_ids, list) or not order_ids:
        raise ValidationError("group.order_ids must be a non-empty list")
    clean_ids: List[int] = []
    for oid in order_ids:
        if not isinstance(oid, int):
            raise ValidationError("group.order_ids must contain integers")
        if oid in clean_ids:
            continue
        clean_ids.append(oid)
    if len(clean_ids) > MAX_ORDERS_PER_TRIP:
        raise ValidationError(
            f"A single robot cannot carry more than {MAX_ORDERS_PER_TRIP} orders"
        )
    return robot_id, clean_ids


def confirm_dispatch(groups: List[Dict]) -> Dict:
    """Persist admin-composed trips.

    groups: [{ "robot_id": int, "order_ids": [int, ...] }, ...]
    """
    if not isinstance(groups, list) or not groups:
        raise ValidationError("groups must be a non-empty list")

    # Validate up-front so a single bad group blocks the whole call.
    parsed: List[Tuple[int, List[int]]] = [_validate_group(g) for g in groups]

    robot_ids = [r for r, _ in parsed]
    if len(set(robot_ids)) != len(robot_ids):
        raise ValidationError("A robot can only appear once per dispatch")

    all_order_ids: List[int] = []
    for _, oids in parsed:
        all_order_ids.extend(oids)
    if len(set(all_order_ids)) != len(all_order_ids):
        raise ValidationError("An order cannot be assigned to multiple robots")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    trips: List[Dict] = []
    try:
        already = _already_assigned(cursor, all_order_ids)
        if already:
            raise ConflictError(
                "One or more orders are already on a delivery trip",
                extra={"order_ids": already},
            )

        for robot_id, order_ids in parsed:
            if not _robot_is_available(cursor, robot_id):
                raise ConflictError(
                    f"Robot #{robot_id} is not idle",
                    extra={"robot_id": robot_id},
                )

            order_rows = _fetch_orders_by_id(cursor, order_ids)
            found_ids = {r["order_id"] for r in order_rows}
            missing = [oid for oid in order_ids if oid not in found_ids]
            if missing:
                raise NotFoundError(
                    "One or more orders were not found",
                    extra={"order_ids": missing},
                )

            total_weight = sum(float(r["total_weight"] or 0.0) for r in order_rows)
            if total_weight > MAX_WEIGHT_LBS:
                raise ValidationError(
                    f"Trip exceeds the {MAX_WEIGHT_LBS} lb capacity",
                    extra={"robot_id": robot_id, "weight": total_weight},
                )

            # Keep stops in the admin-specified order as the input for the
            # optimizer; the optimizer will re-order waypoints for shortest path.
            ordered_rows = [
                next(r for r in order_rows if r["order_id"] == oid)
                for oid in order_ids
            ]
            trip = _build_trip(cursor, robot_id, ordered_rows)
            trips.append(trip)

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

    return {"trips": trips}


def auto_dispatch_expired() -> Dict:
    """Group any pending orders that have waited past the grace window and
    dispatch them on idle robots.

    Orders are bin-packed onto idle robots using a simple first-fit by weight.
    """
    pending = _fetch_pending_rows()
    if not pending:
        return {"trips": [], "skipped": []}

    cutoff = datetime.utcnow() - timedelta(seconds=AUTO_DISPATCH_AFTER_SEC)
    expired = [p for p in pending if p["ready_at"] and p["ready_at"] <= cutoff]
    if not expired:
        return {"trips": [], "skipped": [p["order_id"] for p in pending]}

    fleet = list_fleet()
    idle_robots = [r for r in fleet if r["status"] == "IDLE"]
    if not idle_robots:
        return {
            "trips": [],
            "skipped": [p["order_id"] for p in expired],
            "reason": "No idle robots available",
        }

    # First-fit bin packing by weight into available robots.
    bins: List[Tuple[int, List[Dict]]] = [
        (r["robot_id"], []) for r in idle_robots
    ]
    skipped: List[int] = []
    weights: Dict[int, float] = {r["robot_id"]: 0.0 for r in idle_robots}

    for order in expired:
        weight = float(order["total_weight"] or 0.0)
        placed = False
        for robot_id, bucket in bins:
            if len(bucket) >= MAX_ORDERS_PER_TRIP:
                continue
            if weights[robot_id] + weight > MAX_WEIGHT_LBS:
                continue
            bucket.append(order)
            weights[robot_id] += weight
            placed = True
            break
        if not placed:
            skipped.append(order["order_id"])

    groups = [
        {
            "robot_id": robot_id,
            "order_ids": [o["order_id"] for o in bucket],
        }
        for robot_id, bucket in bins
        if bucket
    ]

    if not groups:
        return {"trips": [], "skipped": skipped}

    result = confirm_dispatch(groups)
    result["skipped"] = skipped
    return result


def update_robot_location(robot_id: int, lat: float, lng: float) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE Robot
        SET CurrentLat = %s, CurrentLng = %s
        WHERE RobotID = %s
        """,
        (lat, lng, robot_id),
    )
    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        raise NotFoundError(f"Robot {robot_id} not found")
    conn.commit()
    cursor.close()
    conn.close()
    return {"robot_id": robot_id, "lat": lat, "lng": lng}
