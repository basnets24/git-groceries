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
