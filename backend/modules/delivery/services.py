import os
from datetime import datetime, timedelta

import mysql.connector

from integrations.google_maps.client import GoogleMapsClient, GoogleMapsConfig
from .delivery_planner import can_add

config = GoogleMapsConfig(api_key=os.getenv("GOOGLE_MAPS_API_KEY"))
client = GoogleMapsClient(config)

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
        WHERE so.Status = 'INPROGRESS'
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

        cursor.execute("""
            INSERT INTO DeliveryTrip (Status)
            VALUES ('INPROGRESS')
        """)
        trip_id = cursor.lastrowid

        addresses = [o["address"] for o in trip_orders]

        origin = addresses[0]
        waypoints = addresses[1:-1] if len(addresses) > 2 else []
        destination = addresses[-1]

        route = client.optimize_route(origin, waypoints, destination)

        if route.get("status") != "OK":
            continue

        legs = route.get("legs", [])
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
