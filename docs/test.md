# OFS Food Delivery Service — Test Plan

**Group #4**  
Members: Sneha Basnet, Diya Dalal, Ansh Dhakalia, Kaizan Satta, Andy Van, Victoria Vo

CS160 Software Engineering — San Jose State University  
Instructor: Frank Butt  
Submission Date: February 25, 2025  
Last Updated: April 27, 2026

---

## 1. Purpose

This document describes the test strategy for the OFS platform and reflects the verified state of the implemented test suite. The goal is to validate the full ordering, delivery, and administration workflow across backend services, gateway routing, and frontend UI. End-to-end testing was performed manually by the developers to verify the full user journey across the stack.

---

## 2. Test Strategy

Testing is organized into four layers:

| Layer | Scope |
|---|---|
| **Unit** | Individual service logic: cart reservation, pricing, auth |
| **Integration** | Communication between frontend, backend, database, gateway, and Stripe/Google Maps |
| **End-to-End** | Complete customer and staff workflows, performed manually by developers |
| **Security** | Authentication, authorization, and role-based access control |

The stack runs in Docker with React frontend, Apache proxy, Flask backend, and MySQL.

---

## 3. Test Environment

All automated tests run against real services and real database state:

- **PyTest** uses a real MySQL database with per-module setup and teardown via `conftest.py`.
- **Stripe** payment tests use the sandbox environment with real `PaymentIntent` records.
- **Google Maps** is exercised for address validation and delivery zone routing.
- **Vitest** runs frontend component tests with `jsdom`.

---

## 4. Coverage by Area

### 4.1 Authentication and Authorization

**Status: Covered**  
**File:** [tests/test_auth.py](../tests/test_auth.py)

| Class | Tests | What is Verified |
|---|---|---|
| `TestRegister` | 4 | Duplicate username/email rejected; missing fields; weak password rejected |
| `TestLogin` | 5 | Login by email and username; wrong password; nonexistent user; missing fields |
| `TestMe` | 3 | Valid token; no token; bad/malformed token |
| `TestRoleAssignment` | 4 | Superadmin and manager can assign EMPLOYEE; manager cannot self-elevate; customer blocked |
| `TestUserSearch` | 3 | Search by email; query too short; customer cannot search |
| `TestRbacCustomerBlocked` | 11 | Customer blocked from inventory, product admin, orders, robots, dispatch, revenue, trips |
| `TestRbacEmployeeBlocked` | 3 | Employee blocked from robot location updates, role assignment, user search |
| `TestRbacNoToken` | 4 | Unauthenticated requests rejected on inventory, orders, revenue, dispatch |

**Subtotal: 37 tests**

---

### 4.2 Product Catalog and Inventory

**Status: Partially covered**  
**Files:** [tests/test_endpoints.sh](../tests/test_endpoints.sh), [tests/test_auth.py](../tests/test_auth.py)

- Product creation and inventory updates are tested via shell scripts.
- Invalid inputs (negative quantity, missing fields) are rejected.
- Customer access to product and inventory admin endpoints is blocked (covered in `TestRbacCustomerBlocked`).
- Gap: no dedicated PyTest suite for full catalog CRUD; shell scripts provide smoke-level coverage.

---

### 4.3 Shopping Cart

**Status: Covered**  
**File:** [tests/test_cart.py](../tests/test_cart.py)

| Class | Tests | What is Verified |
|---|---|---|
| `TestCartReservation` | 7 | Add/increase/decrease/remove items; oversell returns 409; concurrent reservation of last units stays atomic |
| `TestCartAuth` | 4 | No token (401); wrong customer (403); missing product ID (400); nonexistent product (404) |

**Subtotal: 11 tests**

---

### 4.4 Customer Profiles and Addresses

**Status: Covered**  
**Files:** [tests/test_customer_profiles.sh](../tests/test_customer_profiles.sh), [tests/test_remaining_gaps.py](../tests/test_remaining_gaps.py)

- Profile read and update flows are covered via shell scripts (14 curl-based checks).
- Address create, edit, default selection, and deletion are covered.
- Automatic default address promotion after deletion is now explicitly asserted in `TestDefaultAddressPromotion`.

---

### 4.5 Checkout, Orders, and Payment

**Status: Covered**  
**File:** [tests/test_checkout.py](../tests/test_checkout.py)

| Class | Tests | What is Verified |
|---|---|---|
| `TestWeightBasedDeliveryFee` | 6 | Below/at/above weight threshold; fee removed when quantity drops; weight summed across items; weight multiplied by quantity |
| `TestCheckoutEdgeCases` | 3 | No token (401); empty cart (400); response shape |
| `TestCompleteOrder` | 6 | Inventory decrements on completion; idempotency; 404 for nonexistent order; 400 for non-in-progress order; no token (401); multi-item decrement |
| `TestPaymentFailureRollback` | 4 | No payment record rejected; pending Stripe intent rejected; failed payment leaves inventory unchanged; retry with success completes order |

**Subtotal: 19 tests**

---

### 4.6 Delivery Scheduling and Robot Routing

**Status: Covered**  
**Files:** [tests/test_dispatch.py](../tests/test_dispatch.py), [tests/test_delivery_zone.py](../tests/test_delivery_zone.py), [tests/test_trip_completion.py](../tests/test_trip_completion.py)

| File / Class | Tests | What is Verified |
|---|---|---|
| `TestDispatchConstraints` | 10 | Auth guards; max-orders-per-trip limit; duplicate robot/order across groups; non-idle robot (409); nonexistent orders (404); weight limit (400); valid dispatch creates trip and updates robot state |
| `TestAutoDispatch` | 7 | Auth guards; grace window skips recent orders; no idle robots skips dispatch; expired order dispatched; weight overload splits across robots; order-count overflow splits across robots |
| `TestValidateZoneEndpoint` | 9 | Auth guard; missing/empty address (400); addresses inside, near edge, and outside delivery radius; unresolvable address returns 400 not 500; response shape |
| `TestCompleteOrderZoneValidation` | 4 | Out-of-range address blocks order completion; order stays in-progress after rejection; valid address does not block; no address skips zone check |
| `TestLastStopCompletesTrip` | 3 | Order marked delivered; trip marked completed; robot transitions to RETURNING |
| `TestReturnEtaResetsRobot` | 2 | Robot becomes IDLE after return ETA elapses; stays RETURNING before ETA |
| `TestPartialTripCompletion` | 3 | First stop delivered keeps trip in-progress and robot dispatched; all stops delivered closes trip |
| `TestTripCompletionGuards` | 4 | No token (401); missing order ID (400); order not in trip (400); wrong customer blocked |

**Subtotal: 42 tests**

---

### 4.7 Gateway / Proxy

**Status: Partially covered**  
**File:** [tests/test_gateway_proxy.py](../tests/test_gateway_proxy.py)

| Test | What is Verified |
|---|---|
| `test_gateway_health_matches_backend` | Apache health route response matches direct backend response |
| `test_gateway_keeps_api_prefix` | Gateway preserves `/api/` prefix when forwarding requests |
| `test_gateway_forwards_auth_token` | Authorization header is forwarded correctly to the backend |

**Subtotal: 3 tests**

Known gaps (infrastructure-dependent, not exercised locally):

- **HTTPS enforcement** — local Apache setup does not include TLS termination or redirect rules.
- **Timeout failure handling** — requires infrastructure-level proxy timeout and upstream failure configuration not available locally.

---

### 4.8 Frontend UI

**Status: Covered**  
**Files:** [frontend/src/App.test.tsx](../frontend/src/App.test.tsx), [frontend/src/\_\_tests\_\_/](../frontend/src/__tests__/)

| File | Tests | What is Verified |
|---|---|---|
| `App.test.tsx` | 2 | Guest home renders; register shows password-mismatch error |
| `Login.test.tsx` | 5 | Form renders; login succeeds for CUSTOMER, EMPLOYEE, and MANAGER; error on invalid credentials |
| `Register.test.tsx` | 1 | Validation error when passwords do not match |
| `Home.test.tsx` | 1 | Guest home experience renders |
| `Catalog.test.tsx` | 2 | Products and categories render from API; category filtering works |
| `Cart.test.tsx` | 3 | Empty state; items with price and quantity controls; delivery charge for items ≥ 20 lbs |
| `Inventory.test.tsx` | 3 | Stock levels displayed for employee; category view and management; low-stock warning below threshold |

**Subtotal: 17 Vitest tests**

---

### 4.9 Additional Gap Coverage

**File:** [tests/test_remaining_gaps.py](../tests/test_remaining_gaps.py)

Added to close specific gaps identified during review:

| Class | Tests | What is Verified |
|---|---|---|
| `TestOrderHistoryEndpoint` | 1 | Customer can retrieve completed order history via `GET /api/orders` |
| `TestDefaultAddressPromotion` | 1 | Deleting the default address automatically promotes the next address to default |
| `TestTokenExpiryBehavior` | 1 | An expired JWT token is rejected with 401 |

**Subtotal: 3 tests**

---

## 5. Metrics Summary

| Layer | Files | Test Count | Status |
|---|---|---|---|
| PyTest (backend + gateway) | 8 `.py` files | **115** | All passing |
| Shell scripts | 2 `.sh` files | ~14 curl checks | Run manually |
| Vitest (frontend) | 7 `.tsx` files | **17** | All passing |
| **Total automated** | | **132** | |

- Estimated overall coverage: **~90%**
- All critical backend paths pass.

---

## 6. Remaining Gaps

| Gap | Reason | Impact |
|---|---|---|
| Gateway HTTPS enforcement | TLS termination not enabled in local Apache setup | Low — enforced at deployment layer |
| Gateway timeout failure handling | Requires infrastructure-level proxy configuration not available locally | Low — depends on upstream infra |
| Product catalog full CRUD (PyTest) | Only shell-script coverage; no dedicated PyTest class | Medium — currently verified manually |

---

## 7. Final Assessment

The OFS test suite covers authentication, cart logic, checkout, dispatch, delivery zone validation, robot trip lifecycle, and frontend UI with 132 automated tests across 15 test files. Three previously noted gaps, order history, default address promotion, and token expiry, have been closed in `test_remaining_gaps.py`. The two remaining infrastructure-dependent gaps (gateway HTTPS enforcement and timeout handling) cannot be reproduced in the local Docker environment and depend on production deployment configuration.
