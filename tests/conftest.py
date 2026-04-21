"""
Shared fixtures and helpers for backend endpoint tests.

Requires: pip install requests mysql-connector-python python-dotenv
Run:      pytest tests/ -v
"""

import os
import time

import mysql.connector
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:5001")
DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3307")),
    "user": os.getenv("MYSQL_USER", "mechanism"),
    "password": os.getenv("MYSQL_PASSWORD", "hellohello"),
    "database": os.getenv("MYSQL_DATABASE", "cs160_db"),
}

# ---- test user constants ----
TEST_USERNAME = "testuser_e2e"
TEST_EMAIL = "testuser_e2e@example.com"
TEST_PASSWORD = "TestPass1"

MANAGER_USERNAME = "testmanager_e2e"
MANAGER_EMAIL = "testmanager_e2e@example.com"

SUPERADMIN_USERNAME = "testsuperadmin_e2e"
SUPERADMIN_EMAIL = "testsuperadmin_e2e@example.com"

EMPLOYEE_USERNAME = "testemployee_e2e"
EMPLOYEE_EMAIL = "testemployee_e2e@example.com"


# ---- DB helpers ----

def get_db():
    return mysql.connector.connect(**DB_CONFIG)


def db_execute(sql, params=None, fetch=False):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(sql, params or ())
    result = cursor.fetchall() if fetch else None
    conn.commit()
    cursor.close()
    conn.close()
    return result


# ---- HTTP helpers ----

def api(method, path, token=None, **kwargs):
    """Send a request to the backend. Returns requests.Response."""
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return requests.request(method, f"{BASE_URL}{path}", headers=headers, **kwargs)


def login(email_or_username, password=TEST_PASSWORD):
    r = api("POST", "/api/auth/login", json={
        "emailOrUsername": email_or_username,
        "password": password,
    })
    r.raise_for_status()
    return r.json()["token"], r.json()["customerID"]


# ---- Setup / Cleanup ----

def setup_test_users():
    """Register test users via the API and promote roles directly in the DB.

    Returns a dict with tokens and IDs for each role.
    """
    users = {}

    # 1. Register a plain customer
    r = api("POST", "/api/auth/register", json={
        "username": TEST_USERNAME,
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert r.status_code == 201, f"Customer register failed: {r.text}"
    token, uid = login(TEST_EMAIL)
    users["customer"] = {"token": token, "id": uid}

    # 2. Register + promote employee
    r = api("POST", "/api/auth/register", json={
        "username": EMPLOYEE_USERNAME,
        "email": EMPLOYEE_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert r.status_code == 201, f"Employee register failed: {r.text}"
    token, uid = login(EMPLOYEE_EMAIL)
    db_execute("UPDATE `User` SET Role = 'EMPLOYEE' WHERE UserID = %s", (uid,))
    # re-login to get a token with the correct role
    token, uid = login(EMPLOYEE_EMAIL)
    users["employee"] = {"token": token, "id": uid}

    # 3. Register + promote manager
    r = api("POST", "/api/auth/register", json={
        "username": MANAGER_USERNAME,
        "email": MANAGER_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert r.status_code == 201, f"Manager register failed: {r.text}"
    token, uid = login(MANAGER_EMAIL)
    db_execute("UPDATE `User` SET Role = 'MANAGER' WHERE UserID = %s", (uid,))
    token, uid = login(MANAGER_EMAIL)
    users["manager"] = {"token": token, "id": uid}

    # 4. Register + promote superadmin
    r = api("POST", "/api/auth/register", json={
        "username": SUPERADMIN_USERNAME,
        "email": SUPERADMIN_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert r.status_code == 201, f"Superadmin register failed: {r.text}"
    token, uid = login(SUPERADMIN_EMAIL)
    db_execute("UPDATE `User` SET Role = 'SUPERADMIN' WHERE UserID = %s", (uid,))
    token, uid = login(SUPERADMIN_EMAIL)
    users["superadmin"] = {"token": token, "id": uid}

    return users


def cleanup_test_data():
    """Remove all test data created during the run, in FK-safe order."""
    conn = get_db()
    cursor = conn.cursor()

    # Collect test user IDs
    cursor.execute(
        "SELECT UserID FROM `User` WHERE Username IN (%s, %s, %s, %s)",
        (TEST_USERNAME, EMPLOYEE_USERNAME, MANAGER_USERNAME, SUPERADMIN_USERNAME),
    )
    user_ids = [row[0] for row in cursor.fetchall()]

    if user_ids:
        placeholders = ",".join(["%s"] * len(user_ids))

        # Shopping order items (via orders)
        cursor.execute(
            f"""DELETE soi FROM ShoppingOrderItem soi
                JOIN ShoppingOrder so ON soi.ShoppingOrderID = so.ShoppingOrderID
                WHERE so.UserID IN ({placeholders})""",
            tuple(user_ids),
        )

        # Payments (via orders)
        cursor.execute(
            f"""DELETE p FROM Payment p
                JOIN ShoppingOrder so ON p.ShoppingOrderID = so.ShoppingOrderID
                WHERE so.UserID IN ({placeholders})""",
            tuple(user_ids),
        )

        # Shopping orders
        cursor.execute(
            f"DELETE FROM ShoppingOrder WHERE UserID IN ({placeholders})",
            tuple(user_ids),
        )

        # Customer profiles (must go before addresses due to FK)
        cursor.execute(
            f"DELETE FROM CustomerProfile WHERE UserID IN ({placeholders})",
            tuple(user_ids),
        )

        # Customer addresses
        cursor.execute(
            f"DELETE FROM CustomerAddress WHERE UserID IN ({placeholders})",
            tuple(user_ids),
        )

        # Customer preferences
        cursor.execute(
            f"DELETE FROM CustomerPreference WHERE UserID IN ({placeholders})",
            tuple(user_ids),
        )

        # Users themselves
        cursor.execute(
            f"DELETE FROM `User` WHERE UserID IN ({placeholders})",
            tuple(user_ids),
        )

    # Clean up test products (by name prefix)
    cursor.execute(
        "SELECT ProductID FROM Product WHERE Name LIKE 'TestProduct_e2e%%'"
    )
    product_ids = [row[0] for row in cursor.fetchall()]

    if product_ids:
        placeholders = ",".join(["%s"] * len(product_ids))
        cursor.execute(
            f"DELETE FROM Inventory WHERE ProductID IN ({placeholders})",
            tuple(product_ids),
        )
        cursor.execute(
            f"DELETE FROM Product WHERE ProductID IN ({placeholders})",
            tuple(product_ids),
        )

    # Clean up test category
    cursor.execute(
        "DELETE FROM ProductCategory WHERE Name = 'TestCategory_e2e'"
    )

    conn.commit()
    cursor.close()
    conn.close()
