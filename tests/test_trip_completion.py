"""Tests for the trip auto-completion state machine (Report §7.8).

Robot state machine under test:
  IDLE → DISPATCHED (on dispatch)
       → RETURNING  (when last stop delivered via complete_trip)
       → IDLE       (when ReturnETA elapses, via complete_finished_trips)

Routes exercised:
  POST /api/delivery/<trip_id>/complete  — customer marks an order delivered
  GET  /api/admin/robots                 — triggers complete_finished_trips() via list_fleet()
"""

import pytest
from datetime import datetime, timedelta

from conftest import api, db_execute, cleanup_test_data, setup_test_users, get_db

ORIGIN_LAT = 37.3352
ORIGIN_LNG = -121.8811
ORIGIN_ADDR = "San Jose State University Charles W. Davidson College of Engineering, 1 Washington Sq, San Jose, CA 95192"
STOP_ADDR = "200 E Santa Clara St, San Jose, CA 95113"


# ── DB helpers ────────────────────────────────────────────────

def db_insert(sql, params=None) -> int:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(sql, params or ())
    conn.commit()
    lid = cursor.lastrowid
    cursor.close()
    conn.close()
    return lid


def get_category_id() -> int:
    db_execute("INSERT IGNORE INTO ProductCategory (Name) VALUES ('TestCategory_e2e')")
    rows = db_execute(
        "SELECT ProductCategoryID FROM ProductCategory WHERE Name = 'TestCategory_e2e'",
        fetch=True,
    )
    return rows[0]["ProductCategoryID"]


def get_idle_robot_id():
    rows = db_execute(
        "SELECT RobotID FROM Robot WHERE Status = 'IDLE' ORDER BY RobotID ASC LIMIT 1",
        fetch=True,
    )
    return rows[0]["RobotID"] if rows else None


def get_order_status(order_id: int) -> str:
    rows = db_execute(
        "SELECT Status FROM ShoppingOrder WHERE ShoppingOrderID = %s",
        (order_id,), fetch=True,
    )
    return rows[0]["Status"] if rows else None


def get_trip_status(trip_id: int) -> str:
    rows = db_execute(
        "SELECT Status FROM DeliveryTrip WHERE DeliveryTripID = %s",
        (trip_id,), fetch=True,
    )
    return rows[0]["Status"] if rows else None


def get_robot_row(robot_id: int) -> dict:
    rows = db_execute(
        "SELECT Status, CurrentTripID, ReturnETA FROM Robot WHERE RobotID = %s",
        (robot_id,), fetch=True,
    )
    return rows[0] if rows else {}


def create_dispatched_trip(customer_id: int, robot_id: int, n_orders: int = 1):
    """Insert a INPROGRESS trip with n_orders DISPATCHED stops directly into the DB.

    Returns (trip_id, order_ids, product_id).
    The robot is set to DISPATCHED with CurrentTripID = trip_id.
    """
    cat_id = get_category_id()
    product_id = db_insert(
        """
        INSERT INTO Product (Name, Price, WeightLbs, ProductCategoryID, IsActive)
        VALUES ('TestProduct_e2e_trip', 5.00, 1.0, %s, TRUE)
        """,
        (cat_id,),
    )
    db_execute(
        "INSERT INTO Inventory (ProductID, QuantityInStock, ReservedQty) VALUES (%s, 100, 0)",
        (product_id,),
    )

    order_ids = []
    for _ in range(n_orders):
        oid = db_insert(
            """
            INSERT INTO ShoppingOrder
                (UserID, Street, City, State, Zip, Status)
            VALUES (%s, '200 E Santa Clara St', 'San Jose', 'CA', '95113', 'DISPATCHED')
            """,
            (customer_id,),
        )
        db_execute(
            """
            INSERT INTO ShoppingOrderItem
                (ShoppingOrderID, ProductID, Quantity, PriceAtCheckout, WeightAtCheckout)
            VALUES (%s, %s, 1, 5.00, 1.0)
            """,
            (oid, product_id),
        )
        order_ids.append(oid)

    trip_id = db_insert(
        """
        INSERT INTO DeliveryTrip
            (RobotID, Status, Polyline, OriginAddress, DestinationAddress,
             OriginLat, OriginLng, DistanceM, DurationSec, StartedAt, ConfirmedAt)
        VALUES (%s, 'INPROGRESS', NULL, %s, %s, %s, %s, 1000, 600, NOW(), NOW())
        """,
        (robot_id, ORIGIN_ADDR, STOP_ADDR, ORIGIN_LAT, ORIGIN_LNG),
    )

    now = datetime.utcnow()
    for i, oid in enumerate(order_ids):
        eta = now + timedelta(minutes=10 + i * 5)
        db_execute(
            "INSERT INTO TripStop (DeliveryTripID, ShoppingOrderID, StopIndex, ETA) VALUES (%s, %s, %s, %s)",
            (trip_id, oid, i, eta),
        )

    db_execute(
        "UPDATE Robot SET Status = 'DISPATCHED', CurrentTripID = %s WHERE RobotID = %s",
        (trip_id, robot_id),
    )

    return trip_id, order_ids, product_id


# ── Fixtures ──────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def users():
    cleanup_test_data()
    data = setup_test_users()
    yield data
    cleanup_test_data()


@pytest.fixture()
def ctx(users):
    """Per-test state bag. Cleanup runs after every test."""
    state = {
        "trip_id": None,
        "order_ids": [],
        "robot_id": None,
        "product_id": None,
        "users": users,
    }
    yield state

    # TripStops reference DeliveryTrip — delete before the trip row
    if state["trip_id"]:
        db_execute("DELETE FROM TripStop WHERE DeliveryTripID = %s", (state["trip_id"],))

    # Clear robot FK before deleting the DeliveryTrip row
    if state["robot_id"]:
        db_execute(
            "UPDATE Robot SET Status = 'IDLE', CurrentTripID = NULL, ReturnETA = NULL WHERE RobotID = %s",
            (state["robot_id"],),
        )

    if state["trip_id"]:
        db_execute("DELETE FROM DeliveryTrip WHERE DeliveryTripID = %s", (state["trip_id"],))

    for oid in state["order_ids"]:
        db_execute("DELETE FROM ShoppingOrderItem WHERE ShoppingOrderID = %s", (oid,))
        db_execute("DELETE FROM ShoppingOrder WHERE ShoppingOrderID = %s", (oid,))

    if state["product_id"]:
        db_execute("DELETE FROM Inventory WHERE ProductID = %s", (state["product_id"],))
        db_execute("DELETE FROM Product WHERE ProductID = %s", (state["product_id"],))


# ── §7.8a — Last stop delivered closes trip and starts robot return ──

class TestLastStopCompletesTrip:

    def test_order_marked_delivered(self, ctx):
        """Completing the only stop must set ShoppingOrder.Status = DELIVERED."""
        robot_id = get_idle_robot_id()
        assert robot_id is not None, "Need at least one IDLE robot"
        customer_id = ctx["users"]["customer"]["id"]

        trip_id, [order_id], product_id = create_dispatched_trip(customer_id, robot_id)
        ctx.update({"trip_id": trip_id, "order_ids": [order_id],
                    "robot_id": robot_id, "product_id": product_id})

        r = api("POST", f"/api/delivery/{trip_id}/complete",
                token=ctx["users"]["customer"]["token"],
                json={"order_id": order_id})
        assert r.status_code == 200

        assert get_order_status(order_id) == "DELIVERED"

    def test_trip_marked_completed(self, ctx):
        """Completing the last stop must set DeliveryTrip.Status = COMPLETED."""
        robot_id = get_idle_robot_id()
        assert robot_id is not None
        customer_id = ctx["users"]["customer"]["id"]

        trip_id, [order_id], product_id = create_dispatched_trip(customer_id, robot_id)
        ctx.update({"trip_id": trip_id, "order_ids": [order_id],
                    "robot_id": robot_id, "product_id": product_id})

        api("POST", f"/api/delivery/{trip_id}/complete",
            token=ctx["users"]["customer"]["token"],
            json={"order_id": order_id})

        assert get_trip_status(trip_id) == "COMPLETED"

    def test_robot_transitions_to_returning(self, ctx):
        """After the last stop, the robot must move to RETURNING with a non-null ReturnETA."""
        robot_id = get_idle_robot_id()
        assert robot_id is not None
        customer_id = ctx["users"]["customer"]["id"]

        trip_id, [order_id], product_id = create_dispatched_trip(customer_id, robot_id)
        ctx.update({"trip_id": trip_id, "order_ids": [order_id],
                    "robot_id": robot_id, "product_id": product_id})

        api("POST", f"/api/delivery/{trip_id}/complete",
            token=ctx["users"]["customer"]["token"],
            json={"order_id": order_id})

        robot = get_robot_row(robot_id)
        assert robot["Status"] == "RETURNING"
        assert robot["ReturnETA"] is not None


# ── §7.8b — RETURNING robot transitions to IDLE after ReturnETA elapses ──

class TestReturnEtaResetsRobot:

    def test_robot_becomes_idle_after_return_eta(self, ctx):
        """complete_finished_trips() must reset a RETURNING robot to IDLE once ReturnETA passes."""
        robot_id = get_idle_robot_id()
        assert robot_id is not None, "Need at least one IDLE robot"
        ctx["robot_id"] = robot_id

        # Set the robot to RETURNING with a ReturnETA already in the past
        past_eta = datetime.utcnow() - timedelta(seconds=5)
        db_execute(
            "UPDATE Robot SET Status = 'RETURNING', ReturnETA = %s, CurrentTripID = NULL WHERE RobotID = %s",
            (past_eta, robot_id),
        )

        # GET /api/admin/robots calls list_fleet() → complete_finished_trips()
        r = api("GET", "/api/admin/robots", token=ctx["users"]["manager"]["token"])
        assert r.status_code == 200

        robot = get_robot_row(robot_id)
        assert robot["Status"] == "IDLE"
        assert robot["ReturnETA"] is None
        assert robot["CurrentTripID"] is None

    def test_robot_stays_returning_before_eta(self, ctx):
        """A RETURNING robot whose ReturnETA has not yet elapsed must stay RETURNING."""
        robot_id = get_idle_robot_id()
        assert robot_id is not None
        ctx["robot_id"] = robot_id

        # ReturnETA far in the future
        future_eta = datetime.utcnow() + timedelta(hours=1)
        db_execute(
            "UPDATE Robot SET Status = 'RETURNING', ReturnETA = %s, CurrentTripID = NULL WHERE RobotID = %s",
            (future_eta, robot_id),
        )

        api("GET", "/api/admin/robots", token=ctx["users"]["manager"]["token"])

        assert get_robot_row(robot_id)["Status"] == "RETURNING"


# ── §7.8c — Partial completion leaves trip open ───────────────

class TestPartialTripCompletion:

    def test_first_stop_delivered_trip_stays_inprogress(self, ctx):
        """Completing one stop on a two-stop trip must leave the trip INPROGRESS."""
        robot_id = get_idle_robot_id()
        assert robot_id is not None
        customer_id = ctx["users"]["customer"]["id"]

        trip_id, [oid1, oid2], product_id = create_dispatched_trip(customer_id, robot_id, n_orders=2)
        ctx.update({"trip_id": trip_id, "order_ids": [oid1, oid2],
                    "robot_id": robot_id, "product_id": product_id})

        r = api("POST", f"/api/delivery/{trip_id}/complete",
                token=ctx["users"]["customer"]["token"],
                json={"order_id": oid1})
        assert r.status_code == 200

        assert get_order_status(oid1) == "DELIVERED"
        assert get_order_status(oid2) == "DISPATCHED"   # second stop untouched
        assert get_trip_status(trip_id) == "INPROGRESS" # trip still open

    def test_first_stop_delivered_robot_stays_dispatched(self, ctx):
        """Robot must stay DISPATCHED while any stop remains undelivered."""
        robot_id = get_idle_robot_id()
        assert robot_id is not None
        customer_id = ctx["users"]["customer"]["id"]

        trip_id, [oid1, oid2], product_id = create_dispatched_trip(customer_id, robot_id, n_orders=2)
        ctx.update({"trip_id": trip_id, "order_ids": [oid1, oid2],
                    "robot_id": robot_id, "product_id": product_id})

        api("POST", f"/api/delivery/{trip_id}/complete",
            token=ctx["users"]["customer"]["token"],
            json={"order_id": oid1})

        assert get_robot_row(robot_id)["Status"] == "DISPATCHED"

    def test_all_stops_delivered_closes_trip(self, ctx):
        """Completing all stops sequentially must close the trip and start robot return."""
        robot_id = get_idle_robot_id()
        assert robot_id is not None
        customer_id = ctx["users"]["customer"]["id"]
        token = ctx["users"]["customer"]["token"]

        trip_id, [oid1, oid2], product_id = create_dispatched_trip(customer_id, robot_id, n_orders=2)
        ctx.update({"trip_id": trip_id, "order_ids": [oid1, oid2],
                    "robot_id": robot_id, "product_id": product_id})

        api("POST", f"/api/delivery/{trip_id}/complete", token=token, json={"order_id": oid1})
        api("POST", f"/api/delivery/{trip_id}/complete", token=token, json={"order_id": oid2})

        assert get_trip_status(trip_id) == "COMPLETED"
        assert get_robot_row(robot_id)["Status"] == "RETURNING"


# ── §7.8d — Auth and ownership guards ────────────────────────

class TestTripCompletionGuards:

    def test_no_token_returns_401(self):
        r = api("POST", "/api/delivery/1/complete", json={"order_id": 1})
        assert r.status_code == 401

    def test_missing_order_id_returns_400(self, ctx):
        r = api("POST", "/api/delivery/1/complete",
                token=ctx["users"]["customer"]["token"], json={})
        assert r.status_code == 400

    def test_order_not_in_trip_returns_400(self, ctx):
        """An order_id that doesn't belong to the requested trip must return 400."""
        robot_id = get_idle_robot_id()
        assert robot_id is not None
        customer_id = ctx["users"]["customer"]["id"]

        trip_id, [order_id], product_id = create_dispatched_trip(customer_id, robot_id)
        ctx.update({"trip_id": trip_id, "order_ids": [order_id],
                    "robot_id": robot_id, "product_id": product_id})

        # Use a non-existent order_id that is not in this trip
        r = api("POST", f"/api/delivery/{trip_id}/complete",
                token=ctx["users"]["customer"]["token"],
                json={"order_id": 999999})
        assert r.status_code == 400

    def test_wrong_customer_cannot_complete_order(self, ctx):
        """An order belonging to customer A must be rejected when customer B's token is used."""
        robot_id = get_idle_robot_id()
        assert robot_id is not None
        customer_id = ctx["users"]["customer"]["id"]

        trip_id, [order_id], product_id = create_dispatched_trip(customer_id, robot_id)
        ctx.update({"trip_id": trip_id, "order_ids": [order_id],
                    "robot_id": robot_id, "product_id": product_id})

        # Employee token — employee's customerID won't match the order's UserID
        r = api("POST", f"/api/delivery/{trip_id}/complete",
                token=ctx["users"]["employee"]["token"],
                json={"order_id": order_id})
        assert r.status_code == 400
