"""Tests for /api/cart/<customer_id> — inventory reservation system (Report §7.1)."""

import threading
import pytest

from conftest import (
    api, db_execute, cleanup_test_data, setup_test_users, TEST_PASSWORD,
)


# ── DB helpers ────────────────────────────────────────────────

def get_inventory(product_id: int) -> dict:
    rows = db_execute(
        "SELECT QuantityInStock, ReservedQty FROM Inventory WHERE ProductID = %s",
        (product_id,),
        fetch=True,
    )
    return {"stock": int(rows[0]["QuantityInStock"]), "reserved": int(rows[0]["ReservedQty"])} if rows else {}


def create_test_product(stock: int, weight: float = 1.0) -> int:
    db_execute("INSERT IGNORE INTO ProductCategory (Name) VALUES ('TestCategory_e2e')")
    rows = db_execute(
        "SELECT ProductCategoryID FROM ProductCategory WHERE Name = 'TestCategory_e2e'",
        fetch=True,
    )
    category_id = rows[0]["ProductCategoryID"]

    db_execute(
        """
        INSERT INTO Product (Name, Price, WeightLbs, ProductCategoryID, IsActive)
        VALUES ('TestProduct_e2e_cart', 2.99, %s, %s, TRUE)
        """,
        (weight, category_id),
    )
    rows = db_execute(
        "SELECT ProductID FROM Product WHERE Name = 'TestProduct_e2e_cart' ORDER BY ProductID DESC LIMIT 1",
        fetch=True,
    )
    product_id = rows[0]["ProductID"]
    db_execute(
        "INSERT INTO Inventory (ProductID, QuantityInStock, ReservedQty) VALUES (%s, %s, 0)",
        (product_id, stock),
    )
    return product_id


def clear_cart(customer_id: int, product_id: int) -> None:
    db_execute(
        """
        DELETE soi FROM ShoppingOrderItem soi
        JOIN ShoppingOrder so ON soi.ShoppingOrderID = so.ShoppingOrderID
        WHERE so.UserID = %s AND soi.ProductID = %s
        """,
        (customer_id, product_id),
    )
    db_execute(
        "DELETE FROM ShoppingOrder WHERE UserID = %s AND Status = 'INPROGRESS'",
        (customer_id,),
    )
    db_execute("UPDATE Inventory SET ReservedQty = 0 WHERE ProductID = %s", (product_id,))


# ── Fixtures ──────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def users():
    cleanup_test_data()
    data = setup_test_users()
    yield data
    cleanup_test_data()


@pytest.fixture()
def ctx(users):
    """Per-test fixture: fresh product with 5 units; cleans up after."""
    product_id = create_test_product(stock=5)
    customer_id = users["customer"]["id"]
    token = users["customer"]["token"]

    yield {"product_id": product_id, "customer_id": customer_id, "token": token}

    clear_cart(customer_id, product_id)


# ── Tests ─────────────────────────────────────────────────────

class TestCartReservation:

    def test_add_item_reserves_inventory(self, ctx):
        """Adding 3 units to cart should reserve exactly 3 units in Inventory."""
        r = api("POST", f"/api/cart/{ctx['customer_id']}",
                token=ctx["token"],
                json={"product_id": ctx["product_id"], "quantity": 3})
        assert r.status_code == 201

        inv = get_inventory(ctx["product_id"])
        assert inv["reserved"] == 3
        assert inv["stock"] == 5  # QuantityInStock not yet decremented

    def test_quantity_increase_reserves_more(self, ctx):
        """Increasing cart quantity by 2 should increase ReservedQty by 2."""
        api("POST", f"/api/cart/{ctx['customer_id']}",
            token=ctx["token"],
            json={"product_id": ctx["product_id"], "quantity": 2})

        r = api("POST", f"/api/cart/{ctx['customer_id']}",
                token=ctx["token"],
                json={"product_id": ctx["product_id"], "quantity": 2})
        assert r.status_code == 201

        inv = get_inventory(ctx["product_id"])
        assert inv["reserved"] == 4  # 2 initial + 2 added

    def test_quantity_decrease_releases_reservation(self, ctx):
        """Reducing cart quantity (negative delta) should release the difference."""
        api("POST", f"/api/cart/{ctx['customer_id']}",
            token=ctx["token"],
            json={"product_id": ctx["product_id"], "quantity": 4})

        r = api("POST", f"/api/cart/{ctx['customer_id']}",
                token=ctx["token"],
                json={"product_id": ctx["product_id"], "quantity": -2})
        assert r.status_code == 201

        inv = get_inventory(ctx["product_id"])
        assert inv["reserved"] == 2  # 4 reserved, released 2

    def test_remove_item_releases_full_reservation(self, ctx):
        """Reducing quantity to 0 removes the item and fully releases the reservation."""
        api("POST", f"/api/cart/{ctx['customer_id']}",
            token=ctx["token"],
            json={"product_id": ctx["product_id"], "quantity": 3})

        r = api("POST", f"/api/cart/{ctx['customer_id']}",
                token=ctx["token"],
                json={"product_id": ctx["product_id"], "quantity": -3})
        assert r.status_code == 201

        inv = get_inventory(ctx["product_id"])
        assert inv["reserved"] == 0

        cart = api("GET", f"/api/cart/{ctx['customer_id']}", token=ctx["token"])
        items = cart.json().get("items", [])
        assert not any(i["product_id"] == ctx["product_id"] for i in items)

    def test_exceeds_stock_returns_409(self, ctx):
        """Trying to reserve more units than in stock must return 409 Conflict."""
        r = api("POST", f"/api/cart/{ctx['customer_id']}",
                token=ctx["token"],
                json={"product_id": ctx["product_id"], "quantity": 6})  # stock is 5
        assert r.status_code == 409

        inv = get_inventory(ctx["product_id"])
        assert inv["reserved"] == 0  # no reservation should have been made

    def test_exceeds_stock_after_partial_reserve_returns_409(self, ctx):
        """Reserving 3, then trying to add 3 more (total 6 > 5) must return 409."""
        api("POST", f"/api/cart/{ctx['customer_id']}",
            token=ctx["token"],
            json={"product_id": ctx["product_id"], "quantity": 3})

        r = api("POST", f"/api/cart/{ctx['customer_id']}",
                token=ctx["token"],
                json={"product_id": ctx["product_id"], "quantity": 3})
        assert r.status_code == 409

        inv = get_inventory(ctx["product_id"])
        assert inv["reserved"] == 3  # original reservation unchanged

    def test_concurrent_reserve_last_units(self, ctx):
        """Two simultaneous requests for all 5 units: exactly one succeeds, one gets 409."""
        results = []
        barrier = threading.Barrier(2)

        def add_all():
            barrier.wait()  # both threads start at the same instant
            r = api("POST", f"/api/cart/{ctx['customer_id']}",
                    token=ctx["token"],
                    json={"product_id": ctx["product_id"], "quantity": 5})
            results.append(r.status_code)

        t1 = threading.Thread(target=add_all)
        t2 = threading.Thread(target=add_all)
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        assert results.count(201) == 1, f"Expected 1 success, got: {results}"
        assert results.count(409) == 1, f"Expected 1 conflict, got: {results}"

        inv = get_inventory(ctx["product_id"])
        assert inv["reserved"] == 5  # exactly all 5 units reserved, no more


class TestCartAuth:

    def test_no_token_returns_401(self, ctx):
        r = api("POST", f"/api/cart/{ctx['customer_id']}",
                json={"product_id": ctx["product_id"], "quantity": 1})
        assert r.status_code == 401

    def test_wrong_customer_returns_403(self, users, ctx):
        """A customer cannot add to another customer's cart."""
        other_id = ctx["customer_id"] + 9999
        r = api("POST", f"/api/cart/{other_id}",
                token=ctx["token"],
                json={"product_id": ctx["product_id"], "quantity": 1})
        assert r.status_code == 403

    def test_missing_product_id_returns_400(self, ctx):
        r = api("POST", f"/api/cart/{ctx['customer_id']}",
                token=ctx["token"],
                json={"quantity": 2})
        assert r.status_code == 400

    def test_nonexistent_product_returns_404(self, ctx):
        r = api("POST", f"/api/cart/{ctx['customer_id']}",
                token=ctx["token"],
                json={"product_id": 999999, "quantity": 1})
        assert r.status_code == 404
