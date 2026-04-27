"""Tests for /api/admin/dispatch/* — constraint enforcement and bin-packing (Report §7.5, §7.6)."""

import pytest
from datetime import datetime, timedelta

from conftest import api, db_execute, cleanup_test_data, setup_test_users, get_db

# Real addresses within SJSU's 18-mile delivery radius (used for Google Maps tests)
_ADDRESSES = [
    ("200 E Santa Clara St",        "San Jose", "CA", "95113"),
    ("150 E San Fernando St",       "San Jose", "CA", "95112"),
    ("101 W Mission St",            "San Jose", "CA", "95110"),
    ("100 Paseo de San Antonio",    "San Jose", "CA", "95113"),
    ("50 W San Fernando St",        "San Jose", "CA", "95113"),
    ("300 S 1st St",                "San Jose", "CA", "95113"),
    ("400 S Market St",             "San Jose", "CA", "95113"),
    ("175 W St John St",            "San Jose", "CA", "95110"),
    ("250 Hamilton Ave",            "San Jose", "CA", "95125"),
    ("85 Almaden Blvd",             "San Jose", "CA", "95113"),
    ("380 N 1st St",                "San Jose", "CA", "95112"),
]
_DEFAULT_ADDRESS = _ADDRESSES[0]


# ── DB helpers ────────────────────────────────────────────────

def db_insert(sql, params=None) -> int:
    """Execute an INSERT and return lastrowid."""
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


def get_idle_robot_ids(count: int) -> list:
    rows = db_execute(
        f"SELECT RobotID FROM Robot WHERE Status = 'IDLE' ORDER BY RobotID ASC LIMIT {count}",
        fetch=True,
    )
    return [r["RobotID"] for r in rows]


def set_robot_status(robot_id: int, status: str) -> None:
    # Clear CurrentTripID and ReturnETA so complete_finished_trips() cannot
    # transition this robot back to IDLE via either the trip-elapsed or RETURNING path.
    db_execute(
        "UPDATE Robot SET Status = %s, CurrentTripID = NULL, ReturnETA = NULL WHERE RobotID = %s",
        (status, robot_id),
    )


def reset_robot(robot_id: int) -> None:
    db_execute(
        "UPDATE Robot SET Status = 'IDLE', CurrentTripID = NULL, ReturnETA = NULL WHERE RobotID = %s",
        (robot_id,),
    )


def create_paid_order(
    customer_id: int,
    weight_lbs: float,
    ready_minutes_ago: int = 10,
    address: tuple = None,
) -> int:
    """Directly insert a PAID order with one item of the given weight. Returns order_id."""
    street, city, state, zip_code = address or _DEFAULT_ADDRESS
    ready_at = datetime.utcnow() - timedelta(minutes=ready_minutes_ago)

    cat_id = get_category_id()
    product_id = db_insert(
        """
        INSERT INTO Product (Name, Price, WeightLbs, ProductCategoryID, IsActive)
        VALUES ('TestProduct_e2e_dispatch', 5.00, %s, %s, TRUE)
        """,
        (weight_lbs, cat_id),
    )
    db_execute(
        "INSERT INTO Inventory (ProductID, QuantityInStock, ReservedQty) VALUES (%s, 100, 0)",
        (product_id,),
    )

    order_id = db_insert(
        """
        INSERT INTO ShoppingOrder (UserID, Street, City, State, Zip, Status, ReadyForDispatchAt)
        VALUES (%s, %s, %s, %s, %s, 'PAID', %s)
        """,
        (customer_id, street, city, state, zip_code, ready_at),
    )
    db_execute(
        """
        INSERT INTO ShoppingOrderItem
            (ShoppingOrderID, ProductID, Quantity, PriceAtCheckout, WeightAtCheckout)
        VALUES (%s, %s, 1, 5.00, %s)
        """,
        (order_id, product_id, weight_lbs),
    )
    db_execute(
        """
        INSERT INTO Payment (ShoppingOrderID, Provider, ProviderRef, Amount, Status)
        VALUES (%s, 'Stripe', %s, 5.00, 'SUCCESS')
        """,
        (order_id, f"pi_test_disp_{order_id}"),
    )
    return order_id


def cleanup_ctx(order_ids: list, robot_ids: list) -> None:
    """Tear down trips, robots, orders, and products created during a test."""
    trip_ids = []
    if order_ids:
        phs = ",".join(["%s"] * len(order_ids))
        rows = db_execute(
            f"SELECT DISTINCT DeliveryTripID FROM TripStop WHERE ShoppingOrderID IN ({phs})",
            tuple(order_ids), fetch=True,
        )
        trip_ids = [r["DeliveryTripID"] for r in rows]
        if trip_ids:
            tphs = ",".join(["%s"] * len(trip_ids))
            db_execute(f"DELETE FROM TripStop WHERE DeliveryTripID IN ({tphs})", tuple(trip_ids))

    # Reset robots before deleting DeliveryTrip (clears the CurrentTripID FK reference)
    for rid in robot_ids:
        reset_robot(rid)

    if trip_ids:
        tphs = ",".join(["%s"] * len(trip_ids))
        db_execute(f"DELETE FROM DeliveryTrip WHERE DeliveryTripID IN ({tphs})", tuple(trip_ids))

    for oid in order_ids:
        db_execute("DELETE FROM Payment WHERE ShoppingOrderID = %s", (oid,))
        db_execute("DELETE FROM ShoppingOrderItem WHERE ShoppingOrderID = %s", (oid,))
    if order_ids:
        phs = ",".join(["%s"] * len(order_ids))
        db_execute(f"DELETE FROM ShoppingOrder WHERE ShoppingOrderID IN ({phs})", tuple(order_ids))

    prod_rows = db_execute(
        "SELECT ProductID FROM Product WHERE Name = 'TestProduct_e2e_dispatch'",
        fetch=True,
    )
    for row in prod_rows:
        db_execute("DELETE FROM Inventory WHERE ProductID = %s", (row["ProductID"],))
        db_execute("DELETE FROM Product WHERE ProductID = %s", (row["ProductID"],))


# ── Fixtures ──────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def users():
    cleanup_test_data()
    data = setup_test_users()
    yield data
    cleanup_test_data()


@pytest.fixture()
def ctx(users):
    """Per-test state bag. Append order_ids / robot_ids for automatic cleanup."""
    state = {"order_ids": [], "robot_ids": [], "users": users}
    yield state
    cleanup_ctx(state["order_ids"], state["robot_ids"])


# ── §7.5 — Dispatch constraint enforcement ────────────────────

class TestDispatchConstraints:

    def _dispatch(self, token: str, groups: list):
        return api("POST", "/api/admin/dispatch/confirm",
                   token=token, json={"groups": groups})

    def test_no_token_returns_401(self):
        r = api("POST", "/api/admin/dispatch/confirm", json={"groups": []})
        assert r.status_code == 401

    def test_customer_token_returns_403(self, ctx):
        r = self._dispatch(ctx["users"]["customer"]["token"], [])
        assert r.status_code == 403

    def test_empty_groups_returns_400(self, ctx):
        r = self._dispatch(ctx["users"]["manager"]["token"], [])
        assert r.status_code == 400

    def test_exceeds_max_orders_per_trip_returns_400(self, ctx):
        """A single group with 11 order IDs must be rejected; validation runs before any DB call."""
        token = ctx["users"]["manager"]["token"]
        order_ids = list(range(990001, 990012))  # 11 IDs; don't need to exist
        r = self._dispatch(token, [{"robot_id": 1, "order_ids": order_ids}])
        assert r.status_code == 400
        assert "10" in r.json().get("error", "")   # error mentions the 10-order limit

    def test_duplicate_robot_across_groups_returns_400(self, ctx):
        """The same robot_id in two groups must be rejected before any DB call."""
        token = ctx["users"]["manager"]["token"]
        r = self._dispatch(token, [
            {"robot_id": 1, "order_ids": [990001]},
            {"robot_id": 1, "order_ids": [990002]},
        ])
        assert r.status_code == 400

    def test_duplicate_order_across_groups_returns_400(self, ctx):
        """The same order_id appearing in two groups must be rejected before any DB call."""
        token = ctx["users"]["manager"]["token"]
        r = self._dispatch(token, [
            {"robot_id": 1, "order_ids": [990001]},
            {"robot_id": 2, "order_ids": [990001]},
        ])
        assert r.status_code == 400

    def test_non_idle_robot_returns_409(self, ctx):
        """Dispatching to a robot whose status is not IDLE must return 409."""
        token = ctx["users"]["manager"]["token"]

        robot_id = get_idle_robot_id()
        assert robot_id is not None, "Test requires at least one IDLE robot"
        set_robot_status(robot_id, "DISPATCHED")
        ctx["robot_ids"].append(robot_id)   # reset in cleanup

        # Use a non-existent order ID — robot check fires before order fetch
        r = self._dispatch(token, [{"robot_id": robot_id, "order_ids": [990099]}])
        assert r.status_code == 409

    def test_nonexistent_orders_returns_404(self, ctx):
        """Order IDs that don't exist in the DB must return 404."""
        token = ctx["users"]["manager"]["token"]
        robot_id = get_idle_robot_id()
        assert robot_id is not None, "Test requires at least one IDLE robot"

        r = self._dispatch(token, [{"robot_id": robot_id, "order_ids": [990099]}])
        assert r.status_code == 404

    def test_exceeds_weight_limit_returns_400(self, ctx):
        """A trip whose orders total more than 200 lbs must be rejected."""
        token = ctx["users"]["manager"]["token"]
        customer_id = ctx["users"]["customer"]["id"]

        robot_id = get_idle_robot_id()
        assert robot_id is not None, "Test requires at least one IDLE robot"

        order_id = create_paid_order(customer_id, weight_lbs=201.0)
        ctx["order_ids"].append(order_id)

        r = self._dispatch(token, [{"robot_id": robot_id, "order_ids": [order_id]}])
        assert r.status_code == 400
        assert "200" in r.json().get("error", "")  # error mentions the 200-lb cap

    def test_valid_dispatch_creates_trip_and_updates_robot(self, ctx):
        """A well-formed dispatch must create a trip, set robot to DISPATCHED, and mark order DISPATCHED."""
        token = ctx["users"]["manager"]["token"]
        customer_id = ctx["users"]["customer"]["id"]

        robot_id = get_idle_robot_id()
        assert robot_id is not None, "Test requires at least one IDLE robot"
        ctx["robot_ids"].append(robot_id)

        order_id = create_paid_order(customer_id, weight_lbs=5.0)
        ctx["order_ids"].append(order_id)

        r = self._dispatch(token, [{"robot_id": robot_id, "order_ids": [order_id]}])
        assert r.status_code == 201

        body = r.json()
        assert "trips" in body
        assert len(body["trips"]) == 1

        trip = body["trips"][0]
        assert trip["robot_id"] == robot_id
        assert len(trip["stops"]) == 1
        assert trip["stops"][0]["order_id"] == order_id

        # Verify DB state
        robot_row = db_execute(
            "SELECT Status, CurrentTripID FROM Robot WHERE RobotID = %s",
            (robot_id,), fetch=True,
        )[0]
        assert robot_row["Status"] == "DISPATCHED"
        assert robot_row["CurrentTripID"] == trip["trip_id"]

        order_row = db_execute(
            "SELECT Status FROM ShoppingOrder WHERE ShoppingOrderID = %s",
            (order_id,), fetch=True,
        )[0]
        assert order_row["Status"] == "DISPATCHED"


# ── §7.6 — Auto-dispatch bin-packing ─────────────────────────

class TestAutoDispatch:

    def _auto(self, token: str):
        return api("POST", "/api/admin/dispatch/auto", token=token)

    def test_no_token_returns_401(self):
        r = api("POST", "/api/admin/dispatch/auto")
        assert r.status_code == 401

    def test_customer_token_returns_403(self, ctx):
        r = self._auto(ctx["users"]["customer"]["token"])
        assert r.status_code == 403

    def test_recent_order_within_grace_window_skipped(self, ctx):
        """An order paid less than 5 minutes ago must not be auto-dispatched."""
        customer_id = ctx["users"]["customer"]["id"]
        # ready_minutes_ago=1 → 60 s < AUTO_DISPATCH_AFTER_SEC (300 s)
        order_id = create_paid_order(customer_id, weight_lbs=1.0, ready_minutes_ago=1)
        ctx["order_ids"].append(order_id)

        r = self._auto(ctx["users"]["manager"]["token"])
        assert r.status_code == 201

        dispatched_ids = [
            s["order_id"]
            for trip in r.json().get("trips", [])
            for s in trip.get("stops", [])
        ]
        assert order_id not in dispatched_ids

    def test_no_idle_robots_all_expired_orders_skipped(self, ctx):
        """When every robot is busy, expired orders must appear in the skipped list."""
        customer_id = ctx["users"]["customer"]["id"]
        order_id = create_paid_order(customer_id, weight_lbs=1.0, ready_minutes_ago=10)
        ctx["order_ids"].append(order_id)

        # Mark ALL robots as DISPATCHED (not just currently-IDLE ones).
        # Robots in RETURNING state can be transitioned back to IDLE by
        # complete_finished_trips() when ReturnETA elapses — that call happens
        # inside list_fleet() during auto_dispatch_expired(), so we must block
        # that path too by clearing ReturnETA via set_robot_status.
        all_rows = db_execute("SELECT RobotID FROM Robot", fetch=True)
        for row in all_rows:
            set_robot_status(row["RobotID"], "DISPATCHED")
            ctx["robot_ids"].append(row["RobotID"])

        r = self._auto(ctx["users"]["manager"]["token"])
        assert r.status_code == 201

        body = r.json()
        assert body.get("trips") == []
        assert order_id in body.get("skipped", [])

    def test_expired_order_dispatched_to_idle_robot(self, ctx):
        """An expired PAID order must be dispatched; response includes it in a trip's stops."""
        customer_id = ctx["users"]["customer"]["id"]
        order_id = create_paid_order(customer_id, weight_lbs=1.0, ready_minutes_ago=10)
        ctx["order_ids"].append(order_id)

        r = self._auto(ctx["users"]["manager"]["token"])
        assert r.status_code == 201

        body = r.json()
        trips = body.get("trips", [])
        assert len(trips) >= 1

        dispatched_ids = [s["order_id"] for trip in trips for s in trip.get("stops", [])]
        assert order_id in dispatched_ids

        for trip in trips:
            ctx["robot_ids"].append(trip["robot_id"])

    def test_weight_overload_splits_across_two_robots(self, ctx):
        """Two orders that together exceed 200 lbs must each go on a separate robot."""
        customer_id = ctx["users"]["customer"]["id"]

        # 110 + 110 = 220 lbs → exceeds MAX_WEIGHT_LBS; first-fit assigns one per robot
        oid1 = create_paid_order(customer_id, weight_lbs=110.0, ready_minutes_ago=10,
                                 address=_ADDRESSES[0])
        oid2 = create_paid_order(customer_id, weight_lbs=110.0, ready_minutes_ago=10,
                                 address=_ADDRESSES[1])
        ctx["order_ids"].extend([oid1, oid2])

        idle = get_idle_robot_ids(2)
        assert len(idle) >= 2, "Need at least 2 IDLE robots"

        r = self._auto(ctx["users"]["manager"]["token"])
        assert r.status_code == 201

        body = r.json()
        trips = body.get("trips", [])
        assert len(trips) == 2, "Expected 2 trips since 110+110 > 200 lb cap"

        for trip in trips:
            assert len(trip["stops"]) == 1  # one order per robot
            ctx["robot_ids"].append(trip["robot_id"])

    def test_order_count_overflow_splits_across_two_robots(self, ctx):
        """11 lightweight orders must split as 10 + 1 across two robots (MAX_ORDERS_PER_TRIP = 10)."""
        customer_id = ctx["users"]["customer"]["id"]

        order_ids = [
            create_paid_order(
                customer_id,
                weight_lbs=1.0,
                ready_minutes_ago=10,
                address=_ADDRESSES[i % len(_ADDRESSES)],
            )
            for i in range(11)
        ]
        ctx["order_ids"].extend(order_ids)

        idle = get_idle_robot_ids(2)
        assert len(idle) >= 2, "Need at least 2 IDLE robots"

        r = self._auto(ctx["users"]["manager"]["token"])
        assert r.status_code == 201

        body = r.json()
        trips = body.get("trips", [])
        assert len(trips) == 2, "Expected 2 trips since 11 orders > MAX_ORDERS_PER_TRIP (10)"

        stop_counts = sorted([len(t["stops"]) for t in trips], reverse=True)
        assert stop_counts[0] == 10
        assert stop_counts[1] == 1

        for trip in trips:
            ctx["robot_ids"].append(trip["robot_id"])
