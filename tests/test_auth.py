"""Tests for /api/auth/* endpoints."""

import pytest
from conftest import (
    api, login, cleanup_test_data, setup_test_users,
    TEST_USERNAME, TEST_EMAIL, TEST_PASSWORD,
    MANAGER_EMAIL, EMPLOYEE_EMAIL, SUPERADMIN_EMAIL,
)


@pytest.fixture(scope="module", autouse=True)
def users():
    cleanup_test_data()
    data = setup_test_users()
    yield data
    cleanup_test_data()


# ── Registration ──────────────────────────────────────────────

class TestRegister:
    def test_duplicate_username_rejected(self):
        r = api("POST", "/api/auth/register", json={
            "username": TEST_USERNAME,
            "email": "unique@example.com",
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 400

    def test_duplicate_email_rejected(self):
        r = api("POST", "/api/auth/register", json={
            "username": "unique_user_xyz",
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 400

    def test_missing_fields(self):
        r = api("POST", "/api/auth/register", json={"username": "x"})
        assert r.status_code == 400

    def test_weak_password_rejected(self):
        r = api("POST", "/api/auth/register", json={
            "username": "weakpw_user",
            "email": "weakpw@example.com",
            "password": "short",
        })
        assert r.status_code == 400


# ── Login ─────────────────────────────────────────────────────

class TestLogin:
    def test_login_with_email(self):
        r = api("POST", "/api/auth/login", json={
            "emailOrUsername": TEST_EMAIL,
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 200
        body = r.json()
        assert "token" in body
        assert body["username"] == TEST_USERNAME

    def test_login_with_username(self):
        r = api("POST", "/api/auth/login", json={
            "emailOrUsername": TEST_USERNAME,
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 200
        assert "token" in r.json()

    def test_wrong_password(self):
        r = api("POST", "/api/auth/login", json={
            "emailOrUsername": TEST_EMAIL,
            "password": "WrongPass1",
        })
        assert r.status_code == 401

    def test_nonexistent_user(self):
        r = api("POST", "/api/auth/login", json={
            "emailOrUsername": "nobody@nowhere.com",
            "password": TEST_PASSWORD,
        })
        assert r.status_code == 401

    def test_missing_fields(self):
        r = api("POST", "/api/auth/login", json={})
        assert r.status_code == 400


# ── GET /api/auth/me ──────────────────────────────────────────

class TestMe:
    def test_valid_token(self, users):
        r = api("GET", "/api/auth/me", token=users["customer"]["token"])
        assert r.status_code == 200
        body = r.json()
        assert body["username"] == TEST_USERNAME
        assert body["role"] == "CUSTOMER"

    def test_no_token(self):
        r = api("GET", "/api/auth/me")
        assert r.status_code == 401

    def test_bad_token(self):
        r = api("GET", "/api/auth/me", token="garbage.token.value")
        assert r.status_code == 401


# ── Role assignment ───────────────────────────────────────────

class TestRoleAssignment:
    def test_superadmin_assigns_employee(self, users):
        target_id = users["customer"]["id"]
        r = api("PUT", f"/api/auth/users/{target_id}/role",
                token=users["superadmin"]["token"],
                json={"role": "EMPLOYEE"})
        assert r.status_code == 200
        assert r.json()["role"] == "EMPLOYEE"

        # reset back to CUSTOMER via DB for other tests
        from conftest import db_execute
        db_execute("UPDATE `User` SET Role = 'CUSTOMER' WHERE UserID = %s", (target_id,))

    def test_manager_assigns_employee(self, users):
        target_id = users["customer"]["id"]
        r = api("PUT", f"/api/auth/users/{target_id}/role",
                token=users["manager"]["token"],
                json={"role": "EMPLOYEE"})
        assert r.status_code == 200

        from conftest import db_execute
        db_execute("UPDATE `User` SET Role = 'CUSTOMER' WHERE UserID = %s", (target_id,))

    def test_manager_cannot_assign_manager(self, users):
        target_id = users["customer"]["id"]
        r = api("PUT", f"/api/auth/users/{target_id}/role",
                token=users["manager"]["token"],
                json={"role": "MANAGER"})
        assert r.status_code == 403

    def test_customer_cannot_assign(self, users):
        target_id = users["employee"]["id"]
        r = api("PUT", f"/api/auth/users/{target_id}/role",
                token=users["customer"]["token"],
                json={"role": "EMPLOYEE"})
        assert r.status_code == 403


# ── User search ───────────────────────────────────────────────

class TestUserSearch:
    def test_search_by_email(self, users):
        r = api("GET", "/api/auth/users",
                token=users["manager"]["token"],
                params={"email": "testuser_e2e"})
        assert r.status_code == 200
        results = r.json()["results"]
        assert any(u["email"] == TEST_EMAIL for u in results)

    def test_search_too_short_query(self, users):
        r = api("GET", "/api/auth/users",
                token=users["manager"]["token"],
                params={"email": "x"})
        assert r.status_code == 400

    def test_customer_cannot_search(self, users):
        r = api("GET", "/api/auth/users",
                token=users["customer"]["token"],
                params={"email": "test"})
        assert r.status_code == 403


# ── §7.9 — RBAC: protected endpoints enforce 403 on wrong role ─

class TestRbacCustomerBlocked:
    """CUSTOMER token must receive 403 on every EMPLOYEE+ endpoint."""

    def test_inventory_update_customer_forbidden(self, users):
        r = api("PUT", "/api/inventory/1",
                token=users["customer"]["token"],
                json={"quantity": 5})
        assert r.status_code == 403

    def test_product_create_customer_forbidden(self, users):
        r = api("POST", "/api/products",
                token=users["customer"]["token"],
                json={"name": "x", "price": 1.0, "weight": 1.0, "category_id": 1})
        assert r.status_code == 403

    def test_product_delete_customer_forbidden(self, users):
        r = api("DELETE", "/api/products/1",
                token=users["customer"]["token"])
        assert r.status_code == 403

    def test_admin_orders_list_customer_forbidden(self, users):
        r = api("GET", "/api/admin/orders",
                token=users["customer"]["token"])
        assert r.status_code == 403

    def test_admin_order_detail_customer_forbidden(self, users):
        r = api("GET", "/api/admin/orders/1",
                token=users["customer"]["token"])
        assert r.status_code == 403

    def test_admin_robots_customer_forbidden(self, users):
        r = api("GET", "/api/admin/robots",
                token=users["customer"]["token"])
        assert r.status_code == 403

    def test_dispatch_pending_customer_forbidden(self, users):
        r = api("GET", "/api/admin/dispatch/pending",
                token=users["customer"]["token"])
        assert r.status_code == 403

    def test_dispatch_confirm_customer_forbidden(self, users):
        r = api("POST", "/api/admin/dispatch/confirm",
                token=users["customer"]["token"],
                json={"robot_id": 1, "order_ids": []})
        assert r.status_code == 403

    def test_dispatch_auto_customer_forbidden(self, users):
        r = api("POST", "/api/admin/dispatch/auto",
                token=users["customer"]["token"])
        assert r.status_code == 403

    def test_admin_revenue_customer_forbidden(self, users):
        r = api("GET", "/api/admin/revenue",
                token=users["customer"]["token"])
        assert r.status_code == 403

    def test_admin_trip_detail_customer_forbidden(self, users):
        r = api("GET", "/api/admin/trips/1",
                token=users["customer"]["token"])
        assert r.status_code == 403


class TestRbacEmployeeBlocked:
    """EMPLOYEE token must receive 403 on MANAGER-only endpoints."""

    def test_robot_location_update_employee_forbidden(self, users):
        """PATCH /api/admin/robots/<id>/location requires MANAGER or higher."""
        r = api("PATCH", "/api/admin/robots/1/location",
                token=users["employee"]["token"],
                json={"lat": 37.3382, "lng": -121.8863})
        assert r.status_code == 403

    def test_role_assignment_employee_forbidden(self, users):
        """PUT /api/auth/users/<id>/role requires MANAGER or higher."""
        r = api("PUT", f"/api/auth/users/{users['customer']['id']}/role",
                token=users["employee"]["token"],
                json={"role": "EMPLOYEE"})
        assert r.status_code == 403

    def test_user_search_employee_forbidden(self, users):
        """GET /api/auth/users is MANAGER+; EMPLOYEE must also get 403."""
        r = api("GET", "/api/auth/users",
                token=users["employee"]["token"],
                params={"email": "test"})
        assert r.status_code == 403


class TestRbacNoToken:
    """No token must return 401 on any protected endpoint."""

    def test_inventory_update_no_token(self):
        r = api("PUT", "/api/inventory/1", json={"quantity": 5})
        assert r.status_code == 401

    def test_admin_orders_no_token(self):
        r = api("GET", "/api/admin/orders")
        assert r.status_code == 401

    def test_admin_revenue_no_token(self):
        r = api("GET", "/api/admin/revenue")
        assert r.status_code == 401

    def test_dispatch_confirm_no_token(self):
        r = api("POST", "/api/admin/dispatch/confirm", json={})
        assert r.status_code == 401
