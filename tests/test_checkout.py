"""Tests for POST /api/checkout and POST /api/orders/<id>/complete (Report §7.2, §7.3, §7.4)."""

import pytest

from conftest import api, db_execute, cleanup_test_data, setup_test_users


# ── Helpers ───────────────────────────────────────────────────

def create_product(weight: float, stock: int = 10) -> int:
    """Insert a test product at the given weight (lbs); return product_id."""
    db_execute("INSERT IGNORE INTO ProductCategory (Name) VALUES ('TestCategory_e2e')")
    rows = db_execute(
        "SELECT ProductCategoryID FROM ProductCategory WHERE Name = 'TestCategory_e2e'",
        fetch=True,
    )
    category_id = rows[0]["ProductCategoryID"]

    db_execute(
        """
        INSERT INTO Product (Name, Price, WeightLbs, ProductCategoryID, IsActive)
        VALUES ('TestProduct_e2e_checkout', 5.00, %s, %s, TRUE)
        """,
        (weight, category_id),
    )
    rows = db_execute(
        "SELECT ProductID FROM Product WHERE Name = 'TestProduct_e2e_checkout' ORDER BY ProductID DESC LIMIT 1",
        fetch=True,
    )
    product_id = rows[0]["ProductID"]
    db_execute(
        "INSERT INTO Inventory (ProductID, QuantityInStock, ReservedQty) VALUES (%s, %s, 0)",
        (product_id, stock),
    )
    return product_id


def add_to_cart(customer_id: int, token: str, product_id: int, quantity: int):
    return api("POST", f"/api/cart/{customer_id}", token=token,
               json={"product_id": product_id, "quantity": quantity})


def cleanup_customer_orders(customer_id: int) -> None:
    """Remove all orders, payments, and inventory reservations for the customer."""
    orders = db_execute(
        "SELECT ShoppingOrderID FROM ShoppingOrder WHERE UserID = %s",
        (customer_id,), fetch=True,
    )
    for row in orders:
        oid = row["ShoppingOrderID"]
        db_execute("DELETE FROM Payment WHERE ShoppingOrderID = %s", (oid,))
        db_execute("DELETE FROM ShoppingOrderItem WHERE ShoppingOrderID = %s", (oid,))
    db_execute("DELETE FROM ShoppingOrder WHERE UserID = %s", (customer_id,))

    prod_rows = db_execute(
        "SELECT ProductID FROM Product WHERE Name = 'TestProduct_e2e_checkout'",
        fetch=True,
    )
    for row in prod_rows:
        db_execute("UPDATE Inventory SET ReservedQty = 0 WHERE ProductID = %s", (row["ProductID"],))


# ── Fixtures ──────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def users():
    cleanup_test_data()
    data = setup_test_users()
    yield data
    cleanup_test_data()


@pytest.fixture()
def ctx(users):
    """Per-test fixture: customer credentials + full order cleanup after each test."""
    yield {
        "customer_id": users["customer"]["id"],
        "token": users["customer"]["token"],
    }
    cleanup_customer_orders(users["customer"]["id"])


# ── Tests ─────────────────────────────────────────────────────

class TestWeightBasedDeliveryFee:

    def test_below_threshold_no_delivery_fee(self, ctx):
        """19.99 lbs total → delivery_charge must be $0.00."""
        pid = create_product(weight=19.99)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=1)

        r = api("POST", "/api/checkout", token=ctx["token"])
        assert r.status_code == 201

        checkout = r.json()["checkout"]
        assert checkout["total_weight"] == 19.99
        assert checkout["delivery_charge"] == 0.0
        assert checkout["total_amount"] == checkout["subtotal"]

    def test_at_threshold_delivery_fee_applied(self, ctx):
        """Exactly 20.00 lbs → delivery_charge must be $10.00 (boundary condition)."""
        pid = create_product(weight=20.00)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=1)

        r = api("POST", "/api/checkout", token=ctx["token"])
        assert r.status_code == 201

        checkout = r.json()["checkout"]
        assert checkout["total_weight"] == 20.0
        assert checkout["delivery_charge"] == 10.0
        assert checkout["total_amount"] == checkout["subtotal"] + 10.0

    def test_above_threshold_delivery_fee_applied(self, ctx):
        """25.00 lbs total → delivery_charge must be $10.00."""
        pid = create_product(weight=25.00)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=1)

        r = api("POST", "/api/checkout", token=ctx["token"])
        assert r.status_code == 201

        checkout = r.json()["checkout"]
        assert checkout["total_weight"] == 25.0
        assert checkout["delivery_charge"] == 10.0

    def test_reducing_quantity_removes_fee(self, ctx):
        """Dropping cart weight back below 20 lbs removes the delivery fee on next checkout."""
        # 2 units × 10.5 lbs = 21.0 lbs → $10 fee
        pid = create_product(weight=10.5, stock=5)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=2)

        r = api("POST", "/api/checkout", token=ctx["token"])
        assert r.status_code == 201
        assert r.json()["checkout"]["delivery_charge"] == 10.0

        # Remove 1 unit → 10.5 lbs → $0 fee
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=-1)

        r = api("POST", "/api/checkout", token=ctx["token"])
        assert r.status_code == 201

        checkout = r.json()["checkout"]
        assert checkout["total_weight"] == 10.5
        assert checkout["delivery_charge"] == 0.0

    def test_weight_summed_across_multiple_items(self, ctx):
        """Total weight is the sum across all distinct products in the cart."""
        pid_a = create_product(weight=9.99, stock=5)   # 9.99 lbs
        pid_b = create_product(weight=10.02, stock=5)  # 10.02 lbs → combined 20.01
        add_to_cart(ctx["customer_id"], ctx["token"], pid_a, quantity=1)
        add_to_cart(ctx["customer_id"], ctx["token"], pid_b, quantity=1)

        r = api("POST", "/api/checkout", token=ctx["token"])
        assert r.status_code == 201

        checkout = r.json()["checkout"]
        assert checkout["total_weight"] == 20.01
        assert checkout["delivery_charge"] == 10.0

    def test_weight_multiplied_by_quantity(self, ctx):
        """Weight is price_at_checkout × quantity per line item, not just unit weight."""
        # 3 units × 7.00 lbs = 21.0 lbs → $10 fee
        pid = create_product(weight=7.00, stock=10)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=3)

        r = api("POST", "/api/checkout", token=ctx["token"])
        assert r.status_code == 201

        checkout = r.json()["checkout"]
        assert checkout["total_weight"] == 21.0
        assert checkout["delivery_charge"] == 10.0


class TestCheckoutEdgeCases:

    def test_no_token_returns_401(self, ctx):
        r = api("POST", "/api/checkout")
        assert r.status_code == 401

    def test_empty_cart_returns_400(self, ctx):
        """Calling checkout with nothing in the cart must return 400."""
        r = api("POST", "/api/checkout", token=ctx["token"])
        assert r.status_code == 400

    def test_response_shape(self, ctx):
        """Checkout response must include order_id, a checkout summary, and a payment_intent."""
        pid = create_product(weight=1.0)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=1)

        r = api("POST", "/api/checkout", token=ctx["token"])
        assert r.status_code == 201

        body = r.json()
        assert "order_id" in body
        assert "checkout" in body
        assert "payment_intent" in body

        for key in ("subtotal", "total_weight", "delivery_charge", "total_amount"):
            assert key in body["checkout"], f"Missing checkout field: {key}"

        assert "client_secret" in body["payment_intent"]


# ── Additional helpers for complete_order tests ───────────────

def get_inprogress_order_id(customer_id: int):
    rows = db_execute(
        "SELECT ShoppingOrderID FROM ShoppingOrder WHERE UserID = %s AND Status = 'INPROGRESS' LIMIT 1",
        (customer_id,), fetch=True,
    )
    return rows[0]["ShoppingOrderID"] if rows else None


def get_order_status(order_id: int) -> str:
    rows = db_execute(
        "SELECT Status FROM ShoppingOrder WHERE ShoppingOrderID = %s",
        (order_id,), fetch=True,
    )
    return rows[0]["Status"] if rows else None


def get_inventory(product_id: int) -> dict:
    rows = db_execute(
        "SELECT QuantityInStock, ReservedQty FROM Inventory WHERE ProductID = %s",
        (product_id,), fetch=True,
    )
    return {"stock": int(rows[0]["QuantityInStock"]), "reserved": int(rows[0]["ReservedQty"])} if rows else {}


def insert_success_payment(order_id: int, amount: float = 5.00) -> None:
    """Directly write a SUCCESS payment row, bypassing Stripe for test setup."""
    db_execute(
        """
        INSERT INTO Payment (ShoppingOrderID, Provider, ProviderRef, Amount, Status)
        VALUES (%s, 'Stripe', %s, %s, 'SUCCESS')
        """,
        (order_id, f"pi_test_success_{order_id}", amount),
    )


def complete_order(order_id: int, token: str, address: dict = None):
    body = address or {}
    return api("POST", f"/api/orders/{order_id}/complete", token=token, json=body)


# ── §7.3 — Checkout transaction integrity & idempotency ───────

class TestCompleteOrder:

    def test_complete_order_decrements_inventory(self, ctx):
        """Completing a paid order must decrement QuantityInStock and zero out ReservedQty."""
        pid = create_product(weight=1.0, stock=5)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=2)

        order_id = get_inprogress_order_id(ctx["customer_id"])
        assert order_id is not None

        inv_before = get_inventory(pid)
        assert inv_before["reserved"] == 2
        assert inv_before["stock"] == 5

        insert_success_payment(order_id)

        r = complete_order(order_id, ctx["token"])
        assert r.status_code == 200

        assert get_order_status(order_id) == "PAID"

        inv_after = get_inventory(pid)
        assert inv_after["stock"] == 3       # 5 - 2
        assert inv_after["reserved"] == 0    # 2 - 2

    def test_complete_order_idempotent(self, ctx):
        """Calling complete twice on the same order must succeed both times without double-decrementing inventory."""
        pid = create_product(weight=1.0, stock=5)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=2)

        order_id = get_inprogress_order_id(ctx["customer_id"])
        insert_success_payment(order_id)

        r1 = complete_order(order_id, ctx["token"])
        assert r1.status_code == 200

        r2 = complete_order(order_id, ctx["token"])
        assert r2.status_code == 200

        inv = get_inventory(pid)
        assert inv["stock"] == 3    # decremented exactly once
        assert inv["reserved"] == 0

    def test_complete_order_nonexistent_returns_404(self, ctx):
        """Attempting to complete an order that doesn't belong to this customer must return 404."""
        r = complete_order(999999, ctx["token"])
        assert r.status_code == 404

    def test_complete_order_non_inprogress_returns_400(self, ctx):
        """Completing an order that is not INPROGRESS (e.g. DISPATCHED) must return 400."""
        pid = create_product(weight=1.0, stock=5)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=1)

        order_id = get_inprogress_order_id(ctx["customer_id"])
        db_execute(
            "UPDATE ShoppingOrder SET Status = 'DISPATCHED' WHERE ShoppingOrderID = %s",
            (order_id,),
        )

        r = complete_order(order_id, ctx["token"])
        assert r.status_code == 400

    def test_complete_order_no_token_returns_401(self):
        r = api("POST", "/api/orders/1/complete", json={})
        assert r.status_code == 401

    def test_complete_order_multi_item_decrements_all(self, ctx):
        """All line items in the order have their inventory decremented atomically."""
        pid_a = create_product(weight=1.0, stock=10)
        pid_b = create_product(weight=1.0, stock=8)
        add_to_cart(ctx["customer_id"], ctx["token"], pid_a, quantity=3)
        add_to_cart(ctx["customer_id"], ctx["token"], pid_b, quantity=2)

        order_id = get_inprogress_order_id(ctx["customer_id"])
        insert_success_payment(order_id)

        r = complete_order(order_id, ctx["token"])
        assert r.status_code == 200

        assert get_inventory(pid_a)["stock"] == 7   # 10 - 3
        assert get_inventory(pid_b)["stock"] == 6   # 8 - 2
        assert get_inventory(pid_a)["reserved"] == 0
        assert get_inventory(pid_b)["reserved"] == 0


# ── §7.4 — Payment failure rollback ──────────────────────────

class TestPaymentFailureRollback:

    def test_no_payment_record_rejected(self, ctx):
        """complete_order with no Payment row must be rejected; order stays INPROGRESS."""
        pid = create_product(weight=1.0, stock=5)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=3)

        order_id = get_inprogress_order_id(ctx["customer_id"])
        # Deliberately skip inserting any Payment record

        r = complete_order(order_id, ctx["token"])
        assert r.status_code in (400, 500)  # ValidationError or ServiceError

        assert get_order_status(order_id) == "INPROGRESS"

        inv = get_inventory(pid)
        assert inv["reserved"] == 3   # reservation unchanged
        assert inv["stock"] == 5      # stock not decremented

    def test_pending_stripe_payment_rejected(self, ctx):
        """complete_order against an unconfirmed Stripe PaymentIntent must be rejected."""
        pid = create_product(weight=1.0, stock=5)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=2)

        # Create a real PENDING PaymentIntent via the checkout endpoint
        checkout_r = api("POST", "/api/checkout", token=ctx["token"])
        assert checkout_r.status_code == 201
        order_id = checkout_r.json()["order_id"]

        # Attempt to complete without confirming payment in Stripe
        r = complete_order(order_id, ctx["token"])
        assert r.status_code in (400, 500)  # Stripe reports requires_payment_method

        assert get_order_status(order_id) == "INPROGRESS"

    def test_failed_payment_inventory_unchanged(self, ctx):
        """After a failed complete_order, QuantityInStock and ReservedQty must be unchanged."""
        pid = create_product(weight=1.0, stock=10)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=4)

        order_id = get_inprogress_order_id(ctx["customer_id"])

        inv_before = get_inventory(pid)
        assert inv_before["reserved"] == 4
        assert inv_before["stock"] == 10

        # Attempt complete with no payment
        r = complete_order(order_id, ctx["token"])
        assert r.status_code in (400, 500)

        inv_after = get_inventory(pid)
        assert inv_after["stock"] == inv_before["stock"]      # unchanged
        assert inv_after["reserved"] == inv_before["reserved"]  # unchanged

    def test_retry_with_success_payment_completes_order(self, ctx):
        """After a failed attempt, inserting a SUCCESS payment and retrying must succeed."""
        pid = create_product(weight=1.0, stock=5)
        add_to_cart(ctx["customer_id"], ctx["token"], pid, quantity=2)

        order_id = get_inprogress_order_id(ctx["customer_id"])

        # First attempt — no payment → rejected
        r1 = complete_order(order_id, ctx["token"])
        assert r1.status_code in (400, 500)
        assert get_order_status(order_id) == "INPROGRESS"

        # Fix: insert SUCCESS payment and retry
        insert_success_payment(order_id)
        r2 = complete_order(order_id, ctx["token"])
        assert r2.status_code == 200
        assert get_order_status(order_id) == "PAID"

        inv = get_inventory(pid)
        assert inv["stock"] == 3
        assert inv["reserved"] == 0
