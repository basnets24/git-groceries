# OFS Food Delivery Service: Updated Test Plan Summary

**Group #4**  
Sneha Basnet, Diya Dalal, Ansh Dhakalia, Kaizan Satta, Andy Van, Victoria Vo

CS160 Software Engineering  
San Jose State University  
Instructor: Frank Butt  
Submission Date: February 25, 2025  
Last Updated: April 27, 2026

## 1. Purpose

This document summarizes the test strategy for the OFS platform and reflects the current state of the implemented test suite. The goal is to validate the full ordering, delivery, and administration workflow across backend services, gateway routing, and frontend UI. End-to-end testing was performed manually by the developers to verify the full user journey across the stack.

## 2. Test Strategy

Testing is organized into four layers:

- Unit testing for individual service logic such as cart reservation, pricing, and auth.
- Integration testing for communication between frontend, backend, database, gateway, and third-party services.
- End-to-end testing for complete customer and staff workflows, performed manually by the developers.
- Security testing for authentication, authorization, and role-based access control.

The stack runs in Docker with React frontend, Apache proxy, Flask backend, and MySQL.

## 3. Current Test Environment

Implemented tests run against real services and real database state:

- PyTest uses a real MySQL database with per-module setup and teardown.
- Stripe payment tests use the sandbox environment.
- Google Maps is exercised for address validation and routing logic.
- Frontend component tests run with Vitest and jsdom.

## 4. Implemented Coverage

### 4.1 Authentication and Authorization

Status: Covered

- Login succeeds for CUSTOMER, EMPLOYEE, and MANAGER roles.
- Invalid credentials, missing fields, and bad tokens fail correctly.
- Role assignment is restricted by privilege level.
- RBAC blocks CUSTOMER and EMPLOYEE accounts from unauthorized admin paths.

Test files:

- tests/test_auth.py

### 4.2 Product Catalog and Inventory

Status: Covered

- Product creation and inventory updates are tested.
- Invalid inputs such as negative quantity and missing fields are rejected.
- CUSTOMER access to product and inventory admin endpoints is blocked.

Test files:

- tests/test_endpoints.sh
- tests/test_auth.py

### 4.3 Shopping Cart

Status: Covered

- Adding, increasing, decreasing, and removing cart items are covered.
- Inventory reservation stays atomic under concurrent access.
- Oversell conflicts are handled correctly.

Test files:

- tests/test_cart.py

### 4.4 Customer Profiles and Addresses

Status: Covered

- Profile read and update flows are covered.
- Address create, edit, default selection, and deletion are covered.
- Remaining gap: automatic default address promotion after deletion is not explicitly asserted.

Test files:

- tests/test_customer_profiles.sh

### 4.5 Checkout, Orders, and Payment

Status: Covered

- Checkout calculates weight-based delivery fees correctly.
- Successful orders decrement stock and clear reservations atomically.
- Failed payments roll back cleanly without corrupting inventory.
- Stripe sandbox behavior is exercised through real PaymentIntent records.

Test files:

- tests/test_checkout.py

### 4.6 Delivery Scheduling and Robot Routing

Status: Covered

- Dispatch respects the 10-order and 200-lb trip limits.
- Auto-dispatch splits work across robots correctly.
- Delivery zone validation is enforced for in-range and out-of-range addresses.
- Robot state transitions are covered, including returning and reset to IDLE.

Test files:

- tests/test_dispatch.py
- tests/test_delivery_zone.py
- tests/test_trip_completion.py

### 4.7 Gateway / Proxy

Status: Partially covered

- Apache forwards health and authenticated requests correctly.
- HTTPS-only enforcement was not validated because the local Apache setup did not include TLS termination or redirect rules.
- Timeout failure handling was not fully validated because it depends on infrastructure-level gateway behavior and upstream timeout configuration not reproduced in the local environment.

Test files:
- tests/test_gateway_proxy.py

### 4.8 Frontend UI

Status: Covered

- Login UI is covered for all roles.
- Product catalog browsing and category filtering are covered.
- Cart and inventory dashboard UI behavior are covered.
- Register and guest home flows are covered.

Test files:

- frontend/src/App.test.tsx
- frontend/src/__tests__/Home.test.tsx
- frontend/src/__tests__/Register.test.tsx
- frontend/src/__tests__/Login.test.tsx
- frontend/src/__tests__/Catalog.test.tsx
- frontend/src/__tests__/Cart.test.tsx
- frontend/src/__tests__/Inventory.test.tsx

## 5. Metrics Summary

- Approximately 108 automated PyTest cases cover the backend and gateway layers.
- 17 Vitest component tests cover the frontend UI.
- All critical backend paths currently pass.
- Overall coverage is approximately 95%.

## 6. Remaining Gaps

The following area still needs additional test coverage:

- Gateway HTTPS enforcement, which was not implemented in the local Apache proxy setup because TLS termination was not enabled.
- Gateway timeout failure handling, which requires infrastructure-level testing of proxy timeout and upstream failure behavior.

## 7. Final Assessment

The OFS test effort includes unit testing, integration testing, security testing, and developer-performed end-to-end testing. The project is in good shape for core functionality, with strong coverage across authentication, cart logic, checkout, dispatch, and frontend UI. The main remaining limitations are gateway-level HTTPS enforcement and timeout failure handling, both of which depend on deployment and infrastructure configuration beyond the current local test setup.