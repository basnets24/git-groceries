"""Tests for delivery zone validation — 18-mile radius (Report §7.7).

Covers:
  POST /api/delivery/validate-zone      — standalone zone check endpoint
  POST /api/orders/<id>/complete        — zone check is the first guard inside complete_order
"""

import pytest

from conftest import api, db_execute, cleanup_test_data, setup_test_users, get_db


# ── Address fixtures ──────────────────────────────────────────
#
# Origin: 37.3382, -121.8863  (downtown San Jose near SJSU)
# Radius: 18 miles

# ~0.5 miles — clearly inside
ADDR_INSIDE_CLOSE = "200 E Santa Clara St, San Jose, CA 95113"

# ~15 miles — still inside
ADDR_INSIDE_EDGE = "39300 Paseo Padre Pkwy, Fremont, CA 94538"

# ~48 miles — clearly outside (San Francisco)
ADDR_OUTSIDE_SF = "1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102"

# ~26 miles — outside (Santa Cruz)
ADDR_OUTSIDE_SANTA_CRUZ = "323 Ocean St, Santa Cruz, CA 95060"

# Unresolvable by Google Maps
ADDR_GARBAGE = "ZZZZNOTAREALPLACE 00000 XYZXYZ"


# ── DB helpers (for complete_order integration tests) ─────────

def db_insert(sql, params=None) -> int:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(sql, params or ())
    conn.commit()
    lid = cursor.lastrowid
    cursor.close()
    conn.close()
    return lid


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


def create_product_with_cart(customer_id: int, token: str) -> int:
    """Add one item to the customer's cart and return the order_id."""
    db_execute("INSERT IGNORE INTO ProductCategory (Name) VALUES ('TestCategory_e2e')")
    rows = db_execute(
        "SELECT ProductCategoryID FROM ProductCategory WHERE Name = 'TestCategory_e2e'",
        fetch=True,
    )
    cat_id = rows[0]["ProductCategoryID"]

    product_id = db_insert(
        "INSERT INTO Product (Name, Price, WeightLbs, ProductCategoryID, IsActive) VALUES ('TestProduct_e2e_zone', 5.00, 1.0, %s, TRUE)",
        (cat_id,),
    )
    db_execute(
        "INSERT INTO Inventory (ProductID, QuantityInStock, ReservedQty) VALUES (%s, 100, 0)",
        (product_id,),
    )
    api("POST", f"/api/cart/{customer_id}", token=token,
        json={"product_id": product_id, "quantity": 1})

    return get_inprogress_order_id(customer_id)


def insert_success_payment(order_id: int) -> None:
    db_execute(
        "INSERT INTO Payment (ShoppingOrderID, Provider, ProviderRef, Amount, Status) VALUES (%s, 'Stripe', %s, 5.00, 'SUCCESS')",
        (order_id, f"pi_test_zone_{order_id}"),
    )


def cleanup_customer(customer_id: int) -> None:
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
        "SELECT ProductID FROM Product WHERE Name = 'TestProduct_e2e_zone'",
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
def token(users):
    return users["customer"]["token"]


@pytest.fixture()
def ctx(users):
    yield {
        "customer_id": users["customer"]["id"],
        "token": users["customer"]["token"],
    }
    cleanup_customer(users["customer"]["id"])


# ── §7.7a,b,c — validate-zone endpoint ───────────────────────

class TestValidateZoneEndpoint:

    def _post(self, address: str, token: str):
        return api("POST", "/api/delivery/validate-zone",
                   token=token, json={"address": address})

    def test_no_token_returns_401(self):
        r = api("POST", "/api/delivery/validate-zone",
                json={"address": ADDR_INSIDE_CLOSE})
        assert r.status_code == 401

    def test_missing_address_field_returns_400(self, token):
        r = api("POST", "/api/delivery/validate-zone",
                token=token, json={})
        assert r.status_code == 400

    def test_empty_address_string_returns_400(self, token):
        r = api("POST", "/api/delivery/validate-zone",
                token=token, json={"address": "   "})
        assert r.status_code == 400

    def test_address_inside_radius_is_valid(self, token):
        """Downtown San Jose (~0.5 miles from origin) must return valid=True."""
        r = self._post(ADDR_INSIDE_CLOSE, token)
        assert r.status_code == 200
        body = r.json()
        assert body["valid"] is True

    def test_address_near_radius_edge_is_valid(self, token):
        """Fremont (~15 miles from origin) is inside the 18-mile radius."""
        r = self._post(ADDR_INSIDE_EDGE, token)
        assert r.status_code == 200
        assert r.json()["valid"] is True

    def test_address_outside_radius_san_francisco_is_invalid(self, token):
        """San Francisco (~48 miles) is well outside the 18-mile radius."""
        r = self._post(ADDR_OUTSIDE_SF, token)
        assert r.status_code == 400
        body = r.json()
        assert body["valid"] is False
        assert "18" in body.get("error", "") or "service area" in body.get("error", "").lower()

    def test_address_outside_radius_santa_cruz_is_invalid(self, token):
        """Santa Cruz (~26 miles) is outside the 18-mile radius."""
        r = self._post(ADDR_OUTSIDE_SANTA_CRUZ, token)
        assert r.status_code == 400
        assert r.json()["valid"] is False

    def test_unresolvable_address_returns_400_not_500(self, token):
        """A garbage address that Google Maps cannot geocode must return 400, never 500."""
        r = self._post(ADDR_GARBAGE, token)
        # Route wraps validate_delivery_zone in try/except → always 200 or 400
        assert r.status_code == 400
        body = r.json()
        assert body["valid"] is False
        assert "error" in body

    def test_response_contains_valid_field(self, token):
        """Every valid response must include the 'valid' boolean key."""
        r = self._post(ADDR_INSIDE_CLOSE, token)
        assert "valid" in r.json()


# ── §7.7d — complete_order rejects out-of-range address ──────

class TestCompleteOrderZoneValidation:

    def test_out_of_range_address_rejects_complete_order(self, ctx):
        """complete_order must return 400 when the delivery address is outside 18 miles."""
        order_id = create_product_with_cart(ctx["customer_id"], ctx["token"])
        assert order_id is not None
        insert_success_payment(order_id)

        r = api("POST", f"/api/orders/{order_id}/complete",
                token=ctx["token"],
                json={
                    "street": "1 Dr Carlton B Goodlett Pl",
                    "city":   "San Francisco",
                    "state":  "CA",
                    "zip":    "94102",
                })
        assert r.status_code == 400

    def test_order_stays_inprogress_after_zone_rejection(self, ctx):
        """After a zone rejection, the order status must remain INPROGRESS unchanged."""
        order_id = create_product_with_cart(ctx["customer_id"], ctx["token"])
        insert_success_payment(order_id)

        api("POST", f"/api/orders/{order_id}/complete",
            token=ctx["token"],
            json={"street": "1 Dr Carlton B Goodlett Pl",
                  "city": "San Francisco", "state": "CA", "zip": "94102"})

        assert get_order_status(order_id) == "INPROGRESS"

    def test_valid_address_does_not_block_complete_order(self, ctx):
        """A San Jose address inside the radius must not be rejected by zone validation."""
        order_id = create_product_with_cart(ctx["customer_id"], ctx["token"])
        insert_success_payment(order_id)

        r = api("POST", f"/api/orders/{order_id}/complete",
                token=ctx["token"],
                json={
                    "street": "200 E Santa Clara St",
                    "city":   "San Jose",
                    "state":  "CA",
                    "zip":    "95113",
                })
        # Zone validation passes; order should complete successfully
        assert r.status_code == 200
        assert get_order_status(order_id) == "PAID"

    def test_no_address_skips_zone_check(self, ctx):
        """Passing no street field must skip zone validation and still complete if payment is ready."""
        order_id = create_product_with_cart(ctx["customer_id"], ctx["token"])
        insert_success_payment(order_id)

        # complete_order only calls validate_delivery_zone when street is truthy
        r = api("POST", f"/api/orders/{order_id}/complete",
                token=ctx["token"], json={})
        assert r.status_code == 200
        assert get_order_status(order_id) == "PAID"
