"""Tests for the Apache gateway / reverse proxy layer."""

import os

import pytest

import requests

from conftest import api, cleanup_test_data, setup_test_users


GATEWAY_BASE_URL = os.getenv("GATEWAY_BASE_URL", "http://localhost")


def gateway_request(method: str, path: str, **kwargs):
    return requests.request(method, f"{GATEWAY_BASE_URL}{path}", **kwargs)


@pytest.fixture(scope="module", autouse=True)
def users():
    cleanup_test_data()
    data = setup_test_users()
    yield data
    cleanup_test_data()


def test_gateway_health_matches_backend():
    backend = api("GET", "/api/health")
    gateway = gateway_request("GET", "/api/health")

    assert backend.status_code == 200
    assert gateway.status_code == 200
    assert gateway.json() == backend.json() == {"status": "OK"}


def test_gateway_keeps_api_prefix():
    response = gateway_request("GET", "/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "OK"}


def test_gateway_forwards_auth_token(users):
    backend = api("GET", "/api/auth/me", token=users["customer"]["token"])
    gateway = gateway_request(
        "GET",
        "/api/auth/me",
        headers={"Authorization": f"Bearer {users['customer']['token']}"},
    )

    assert backend.status_code == 200
    assert gateway.status_code == 200
    assert gateway.json() == backend.json()
