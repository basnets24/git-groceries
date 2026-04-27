"""Tests for coverage gaps called out in docs/test.md.

Adds coverage for:
  - GET /api/orders (order history)
  - automatic default address promotion after deleting the default address
  - expired JWT/session behavior
"""

from datetime import datetime, timedelta
import os

import jwt
import pytest

from conftest import TEST_USERNAME, api, db_execute, cleanup_test_data, setup_test_users


TEST_CATEGORY_NAME = "TestCategory_e2e_gaps"
TEST_PRODUCT_PREFIX = "TestProduct_e2e_gaps"


def create_product(name_suffix: str, weight: float = 1.0, stock: int = 10) -> int:
    db_execute(
        "INSERT IGNORE INTO ProductCategory (Name) VALUES (%s)",
        (TEST_CATEGORY_NAME,),
    )
    category_rows = db_execute(
        "SELECT ProductCategoryID FROM ProductCategory WHERE Name = %s",
        (TEST_CATEGORY_NAME,),
        fetch=True,
    )
    category_id = category_rows[0]["ProductCategoryID"]

    product_name = f"{TEST_PRODUCT_PREFIX}_{name_suffix}"
    db_execute(
        """
        INSERT INTO Product (Name, Price, WeightLbs, ProductCategoryID, IsActive)
        VALUES (%s, 5.00, %s, %s, TRUE)
        """,
        (product_name, weight, category_id),
    )
    product_rows = db_execute(
        "SELECT ProductID FROM Product WHERE Name = %s ORDER BY ProductID DESC LIMIT 1",
        (product_name,),
        fetch=True,
    )
    product_id = product_rows[0]["ProductID"]
    db_execute(
        "INSERT INTO Inventory (ProductID, QuantityInStock, ReservedQty) VALUES (%s, %s, 0)",
        (product_id, stock),
    )
    return product_id


def add_to_cart(customer_id: int, token: str, product_id: int, quantity: int):
    return api(
        "POST",
        f"/api/cart/{customer_id}",
        token=token,
        json={"product_id": product_id, "quantity": quantity},
    )


def get_inprogress_order_id(customer_id: int):
    rows = db_execute(
        "SELECT ShoppingOrderID FROM ShoppingOrder WHERE UserID = %s AND Status = 'INPROGRESS' LIMIT 1",
        (customer_id,),
        fetch=True,
    )
    return rows[0]["ShoppingOrderID"] if rows else None


def insert_success_payment(order_id: int, amount: float = 5.00) -> None:
    db_execute(
        """
        INSERT INTO Payment (ShoppingOrderID, Provider, ProviderRef, Amount, Status)
        VALUES (%s, 'Stripe', %s, %s, 'SUCCESS')
        """,
        (order_id, f"pi_test_gap_{order_id}", amount),
    )


def complete_order(order_id: int, token: str, street: str = "", city: str = "", state: str = "", zip_code: str = ""):
    return api(
        "POST",
        f"/api/orders/{order_id}/complete",
        token=token,
        json={"street": street, "city": city, "state": state, "zip": zip_code},
    )


def get_profile(customer_id: int, token: str):
    return api("GET", f"/api/customers/{customer_id}/profile", token=token)


def create_address(customer_id: int, token: str, label: str, is_default: bool):
    return api(
        "POST",
        f"/api/customers/{customer_id}/addresses",
        token=token,
        json={
            "label": label,
            "streetLine1": f"{label} Street",
            "city": "San Jose",
            "state": "CA",
            "postalCode": "95112",
            "deliveryInstructions": "Leave at door",
            "isDefault": is_default,
        },
    )

@pytest.fixture(scope="module", autouse=True)
def users():
    cleanup_test_data()
    data = setup_test_users()
    yield data
    cleanup_test_data()


class TestOrderHistoryEndpoint:
    def test_customer_sees_completed_order_history(self, users):
        customer_id = users["customer"]["id"]
        token = users["customer"]["token"]
        product_id = create_product("order_history", weight=2.5, stock=5)

        add_to_cart(customer_id, token, product_id, quantity=2)
        order_id = get_inprogress_order_id(customer_id)
        assert order_id is not None

        insert_success_payment(order_id)
        complete_response = complete_order(
            order_id,
            token,
            street="200 E Santa Clara St",
            city="San Jose",
            state="CA",
            zip_code="95113",
        )
        assert complete_response.status_code == 200

        r = api("GET", "/api/orders", token=token)
        assert r.status_code == 200

        body = r.json()
        assert "orders" in body
        assert len(body["orders"]) >= 1

        order = next(item for item in body["orders"] if item["order_id"] == order_id)
        assert order["status"] == "PAID"
        assert order["payment_status"] == "SUCCESS"
        assert order["address"]["street"] == "200 E Santa Clara St"
        assert order["address"]["city"] == "San Jose"
        assert order["address"]["state"] == "CA"
        assert order["address"]["zip"] == "95113"
        assert order["items"][0]["quantity"] == 2


class TestDefaultAddressPromotion:
    def test_default_address_moves_to_remaining_address_on_delete(self, users):
        customer_id = users["customer"]["id"]
        token = users["customer"]["token"]

        first = create_address(customer_id, token, "Primary Home", True)
        assert first.status_code == 201
        first_id = first.json()["address"]["id"]

        second = create_address(customer_id, token, "Backup Home", False)
        assert second.status_code == 201
        second_id = second.json()["address"]["id"]

        before = get_profile(customer_id, token)
        assert before.status_code == 200
        assert before.json()["profile"]["defaultAddressId"] == first_id

        delete_response = api(
            "DELETE",
            f"/api/customers/{customer_id}/addresses/{first_id}",
            token=token,
        )
        assert delete_response.status_code == 200

        after = get_profile(customer_id, token)
        assert after.status_code == 200
        body = after.json()
        assert body["profile"]["defaultAddressId"] == second_id
        assert len(body["addresses"]) == 1
        assert body["addresses"][0]["id"] == second_id
        assert body["addresses"][0]["isDefault"] is True


class TestTokenExpiryBehavior:
    def test_expired_token_is_rejected(self, users):
        secret = os.getenv("JWT_SECRET")
        assert secret, "JWT_SECRET must be available for token-expiry tests"

        expired_token = jwt.encode(
            {
                "customerID": users["customer"]["id"],
                "username": TEST_USERNAME,
                "role": "CUSTOMER",
                "exp": datetime.utcnow() - timedelta(hours=2),
            },
            secret,
            algorithm="HS256",
        )

        response = api("GET", "/api/auth/me", token=expired_token)
        assert response.status_code == 401
