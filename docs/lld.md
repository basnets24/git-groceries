# OFS Food Delivery Service — Low-Level Design Document

**Group #4**
Members: Sneha Basnet, Diya Dalal, Ansh Dhakalia, Kaizan Satta, Andy Van, Victoria Vo

CS160 Software Engineering
San Jose State University
Instructor: Frank Butt
Submission Date: February 25, 2025

---

## 1. Introduction

This document provides the low-level design for the OFS online ordering and delivery platform. While the High-Level Design describes system architecture and major components, this document specifies the internal behavior of modules, the logic used to enforce business rules, and the workflows required to implement system functionality. The OFS platform is implemented as a modular monolith backend written in Python (Flask), serving a React single-page frontend. Apache acts as the reverse proxy and static asset server. MySQL provides persistent storage. External integrations include Stripe for payments and Google Maps for geocoding and route optimization.

---

## 2. Scope and Assumptions

### 2.1 Role Definitions

| Role | Capabilities |
|------|-------------|
| **Customer** | Browse catalog, manage cart, checkout, track delivery, manage profile |
| **Employee** | Update inventory, view and manage orders, monitor fleet |
| **Manager** | All employee permissions plus revenue analytics and role assignment |
| **Superadmin** | Full platform access including all manager capabilities |

### 2.2 Security Assumptions

- All API traffic uses HTTPS.
- Passwords are hashed using bcrypt.
- Payment card data is never stored in the OFS database; it is handled exclusively by Stripe.
- All protected endpoints require a valid JWT Bearer token.
- Role checks are enforced on the backend; frontend access restrictions are supplementary only.

### 2.3 Operational Assumptions

- Delivery robot capacity: max 200 lbs per trip, max 10 orders per trip.
- Routing is computed using the Google Maps Distance Matrix API.
- Database transactions enforce atomic checkout to prevent partial state.
- A robot must be IDLE before it can be assigned to a new trip.

---

## 3. Component Breakdown

### 3.1 Frontend Design and Architecture

The frontend is a React single-page application written in TypeScript. It communicates with the backend exclusively through REST APIs over HTTPS and does not contain business logic or perform direct database operations. Routing is handled client-side using React Router. The application renders different page sets depending on the authenticated user's role.

### 3.2 Frontend State Model

**Auth State (`AuthContext`):** Stores the authenticated user's JWT token, user ID, username, and role. Persisted in session storage. All API requests attach the token as a `Bearer` header.

**Cart State (`CartContext`):** Tracks items in the active cart, running price total, running weight total, and the computed delivery fee. Updated optimistically on add and reconciled with backend responses.

### 3.3 Customer Screens and Responsibilities

#### Login Page
Two input fields for email/username and password. On success, the JWT token and user profile are stored in `AuthContext` and the user is redirected to the Home page. Incorrect credentials display an inline error. Unregistered users are directed to the Register page.

#### Register Page
Input fields for username, email, and password. On successful account creation the user is redirected to the Login page.

#### Home Page
Landing page with store branding, featured categories, and navigation to the catalog.

#### About Page
Static informational page describing OFS and its delivery model.

#### Product Catalog Page
Displays all active products. Users can filter by product name, category, or price range. Each listing shows the product name, image, unit price, weight, and stock status. An out-of-stock indicator is shown when inventory is depleted. An Add to Cart button is present on each in-stock item.

#### Cart Page
Displays all items in the customer's active cart with name, quantity, unit price, and unit weight per item. Shows subtotal, cumulative weight, and delivery fee (free under 20 lbs; $10.00 flat fee at or over 20 lbs). Customers can update item quantities or remove items. Changes are reflected in real time.

#### Checkout Page
Displays a full order summary including subtotal, delivery fee, and total. The customer selects or enters a delivery address. Payment is collected through Stripe's embedded UI — no card data touches OFS servers. On success an order confirmation is displayed. On failure an appropriate error message is shown and the customer may retry.

#### Order History Page
Lists the customer's past and current orders with status indicators (`INPROGRESS`, `PAID`, `DISPATCHED`, `DELIVERED`, `VOID`, `REFUNDED`).

#### Track Delivery Page
Displays the real-time status of an active delivery trip, the robot's assigned stops, and per-stop estimated arrival times.

#### Customer Profile Page
Allows the customer to manage saved delivery addresses, designate a default address, set a substitution preference, and add delivery notes. The default address is pre-populated at checkout.

### 3.4 Staff and Admin Screens

#### Inventory Dashboard
Allows employees, managers, and superadmins to view all products with their current stock counts (on-hand, reserved, available), search for products, and update stock quantities.

#### Delivery Bots Page
Displays the live status of each robot in the fleet (`IDLE`, `DISPATCHED`, `RETURNING`, `OFFLINE`) and its current GPS coordinates.

#### Admin Dashboard
Provides managers and superadmins with a high-level view of store activity.

#### Admin Orders Page
Lists all orders across all customers with status and detail views. Staff can see full order contents, pricing, and fulfillment state for each order.

#### Admin Fleet Page
Shows pending paid orders awaiting dispatch and the available robot fleet. Staff can manually confirm a dispatch group or trigger automatic dispatch for orders that have been waiting beyond the auto-dispatch threshold.

#### Admin Revenue Page
Displays revenue analytics including total sales, order volume, and period-over-period breakdowns for managers and superadmins.

### 3.5 Frontend Error Handling

The frontend converts API error responses into user-facing messages while preserving technical detail in browser console logs.

| Error | Behavior |
|-------|----------|
| Failed login | Incorrect credentials prompt a retry; unrecognized email/username prompts account creation |
| Out-of-stock on cart update | The user is notified before proceeding to checkout |
| Payment failure | The user is notified and prompted to retry or use a different card |
| Zone validation failure | The user is notified that their address is outside the delivery area before checkout proceeds |
| Network or server errors | A generic retry prompt is shown; internal error details are not surfaced |

### 3.6 Backend Architecture and Structure

The backend is a modular Flask application. Each module is a Python package containing `routes.py`, `services.py`, and `repository.py` files. Routes handle HTTP validation and call into services; services own business logic and call repositories; repositories execute parameterized SQL against MySQL.

**Internal layers:**

| Layer | Responsibility |
|-------|---------------|
| API Layer | Request parsing, input validation, HTTP response formatting |
| Service Layer | Business workflows, rule enforcement, cross-module coordination |
| Repository Layer | Parameterized SQL queries and transactions |
| Integration Layer | Stripe and Google Maps client wrappers |

All protected routes use one of two decorators:

```python
@auth_required        # verifies the JWT and attaches the payload to Flask's g context
@roles_required(...)  # extends auth_required; enforces the caller's role is in the permitted set
```

---

### 3.7 Module Logic and Workflows

#### 3.7.1 Identity and Access Management

**Registration**

A new account is created by submitting username, email, and password. The backend validates that all three fields are present, hashes the password with bcrypt, and inserts a row into the `User` table with `Role = CUSTOMER`. Duplicate usernames or emails are rejected.

```
function register_user(username, email, password):
    validate fields are not empty
    hashed = bcrypt.generate_password_hash(password)
    insert User(username, email, hashed, role=CUSTOMER)
```

**Authentication**

Login accepts an email or username identifier alongside a password. The backend retrieves the matching user, verifies the submitted password against the stored bcrypt hash, and returns a signed JWT containing the user ID, username, and role.

```
function authenticate_user(identifier, password):
    user = find_by_email_or_username(identifier)
    if not bcrypt.check_password_hash(user.password_hash, password):
        raise AuthError
    token = jwt.encode({customerID, username, role}, JWT_SECRET)
    return token, user
```

**Role Assignment**

Managers and superadmins may update a user's role to `EMPLOYEE` or `MANAGER` via `PUT /api/auth/users/{id}/role`. Elevation to `SUPERADMIN` through this endpoint is blocked.

---

#### 3.7.2 Customer Profile and Address Management

A customer's profile stores a substitution preference, delivery notes, and a pointer to a default address. Addresses are stored independently of orders so they can be reused across multiple checkouts without affecting historical order records.

```
function add_address(user_id, label, street_line_1, street_line_2,
                     city, state, postal_code, delivery_instructions, is_default):
    insert CustomerAddress(...)
    if is_default:
        update CustomerProfile(default_address_id = new address id)

function set_default_address(user_id, address_id):
    verify address belongs to user_id
    update CustomerProfile(default_address_id = address_id)
```

---

#### 3.7.3 Cart Management

Each customer has one active cart. Adding an item stores a price snapshot and weight snapshot at insertion time so the cart display is consistent even if the catalog changes before checkout.

```
function add_to_cart(customer_id, product_id, quantity):
    product = get_product(product_id)
    if product.quantity_in_stock <= 0:
        raise OutOfStockError
    existing_item = find_cart_item(customer_id, product_id)
    if existing_item:
        existing_item.quantity += quantity
        update(existing_item)
    else:
        insert CartItem(
            customer_id      = customer_id,
            product_id       = product_id,
            quantity         = quantity,
            unit_price_snap  = product.price,
            unit_weight_snap = product.weight_lbs
        )
```

---

#### 3.7.4 Checkout and Order Processing

Checkout is orchestrated as a two-step process.

**Step 1 — Create checkout session (`POST /api/checkout`)**

The backend validates the cart, reserves inventory inside a transaction, computes the order total and delivery fee, creates the `Order` and `OrderLine` records in `INPROGRESS` status, and creates a Stripe PaymentIntent. The `client_secret` is returned to the frontend so Stripe.js can collect and confirm card details without card data touching the OFS server.

```
function create_checkout_session(customer_id):
    cart = get_cart(customer_id)
    if cart is empty:
        raise ValidationError

    BEGIN TRANSACTION
        for each item in cart:
            lock inventory row (SELECT FOR UPDATE)
            available = quantity_in_stock - reserved_qty
            if available < item.quantity:
                ROLLBACK
                raise InsufficientStockError

        for each item in cart:
            inventory.reserved_qty += item.quantity
            update(inventory)

        total_weight = sum(item.unit_weight_snap * item.quantity for item in cart)
        subtotal     = sum(item.unit_price_snap  * item.quantity for item in cart)
        delivery_fee = 10.00 if total_weight >= 20 else 0.00
        total        = subtotal + delivery_fee

        insert Order(customer_id, status=INPROGRESS, total_weight, subtotal, delivery_fee, total)
        for each item in cart:
            insert OrderLine(order_id, product_id, quantity,
                             price=item.unit_price_snap, weight=item.unit_weight_snap)
    COMMIT

    payment_intent = stripe.PaymentIntent.create(amount=total_in_cents, currency='usd')
    return { order_id, client_secret: payment_intent.client_secret }
```

**Step 2 — Complete order (`POST /api/orders/{orderId}/complete`)**

After the frontend confirms payment with Stripe, it calls this endpoint with the delivery address. The backend captures the address inline on the order, transitions the order to `PAID`, deducts reserved inventory from stock, and clears the customer's cart.

```
function complete_order(order_id, customer_id, street, city, state, zip_code):
    order = get_order(order_id) where customer_id matches
    update Order(address fields, status=PAID, ready_for_dispatch_at=now())
    for each order_line:
        inventory.quantity_in_stock -= order_line.quantity
        inventory.reserved_qty     -= order_line.quantity
        update(inventory)
    clear_cart(customer_id)
```

If payment fails on the Stripe side, the frontend does not call the complete endpoint. Reserved inventory is released by a background cleanup process that voids `INPROGRESS` orders that have not completed within a configurable timeout.

---

#### 3.7.5 Payment Processing

Payments are handled through Stripe's PaymentIntent API. The OFS backend creates the intent and records the provider reference. Card details are collected and submitted by Stripe.js running in the browser and never transit through OFS servers.

```
function create_payment_intent(customer_id):
    checkout_result = create_checkout_session(customer_id)
    return checkout_result.payment_intent
```

Payment records are created in `PENDING` status when the intent is created and updated to `SUCCESS` by the `complete_order` workflow, or `FAILED` if the Stripe webhook signals a payment failure.

---

#### 3.7.6 Inventory Control

The inventory module maintains authoritative stock for each product using two counters:

- **`QuantityInStock`** — physical units available on the shelf
- **`ReservedQty`** — units held by `INPROGRESS` orders not yet completed

**Available stock = `QuantityInStock` − `ReservedQty`**

Reservation happens inside the checkout transaction using `SELECT FOR UPDATE` row locks to prevent concurrent checkouts from overselling the same stock.

```
function update_inventory(product_id, quantity):
    verify caller has EMPLOYEE, MANAGER, or SUPERADMIN role
    if quantity < 0:
        raise ValidationError
    update Inventory(quantity_in_stock = quantity) where product_id matches
```

---

#### 3.7.7 Delivery Scheduling and Robot Fleet Management

Delivery scheduling groups `PAID` orders into robot trips. The fleet module enforces per-trip constraints (max 10 orders, max 200 lbs) and calls the Google Maps Distance Matrix API to compute the optimized stop order and route polyline.

```
function list_pending_orders():
    return all Orders where status = PAID and trip not yet assigned
    include ready_for_dispatch_at so the UI can show how long each order has been waiting

function confirm_dispatch(groups):
    for each group in groups:
        robot = find_idle_robot()
        if no robot available:
            raise NoRobotAvailable

        route = google_maps.compute_route(robot.current_location, group.addresses)

        BEGIN TRANSACTION
            insert DeliveryTrip(
                robot_id     = robot.id,
                status       = NOTSTARTED,
                polyline     = route.polyline,
                origin_lat, origin_lng, dest_lat, dest_lng,
                distance_m   = route.distance_meters,
                duration_sec = route.duration_seconds
            )
            for each order in group (sorted by stop_index):
                insert TripStop(trip_id, order_id, stop_index, eta)
                update Order(status = DISPATCHED)
            update Robot(status = DISPATCHED, current_trip_id = trip.id)
        COMMIT

function auto_dispatch_expired():
    expired_orders = orders where ready_for_dispatch_at < now() - AUTO_DISPATCH_AFTER_SEC
    auto_group and dispatch using same confirm_dispatch logic

function complete_trip(trip_id, order_id, customer_id):
    update TripStop(completed = true) for the given order
    update Order(status = DELIVERED)
    if all stops in trip are complete:
        update DeliveryTrip(status = COMPLETED)
        update Robot(status = RETURNING, return_eta = estimated_return_time)
```

**Robot state transitions:**

```
IDLE        → DISPATCHED   (on confirm_dispatch)
DISPATCHED  → RETURNING    (when all trip stops are complete)
RETURNING   → IDLE         (when robot returns to base)
any         → OFFLINE      (manual admin action)
```

Delivery zone validation is performed before checkout reserves inventory. The customer's address is geocoded using the Google Maps Geocoding API and checked against OFS's serviceable zone. Orders outside the zone are rejected before any inventory is touched.

```
function validate_delivery_zone(address_string):
    coordinates = google_maps.geocode(address_string)
    if not within_service_zone(coordinates):
        raise ZoneError("Address is outside the delivery area")
```

---

## 4. API Contracts

All endpoints are prefixed with `/api` and consume and produce JSON over HTTPS. Protected endpoints require an `Authorization: Bearer <token>` header. The Access column uses the following shorthand: **Employee+** means Employee, Manager, and Superadmin; **Manager+** means Manager and Superadmin.

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/register` | Public | Create a new customer account |
| `POST` | `/api/auth/login` | Public | Authenticate and return JWT |
| `GET` | `/api/auth/me` | Authenticated | Return current user profile |
| `GET` | `/api/auth/users?email=<query>` | Manager+ | Search users by email |
| `PUT` | `/api/auth/users/{id}/role` | Manager+ | Assign EMPLOYEE or MANAGER role to a user |

### Product Catalog

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/categories` | Public | List all product categories |
| `GET` | `/api/products` | Public | List products with optional filters |
| `POST` | `/api/products` | Employee+ | Create a new product |
| `DELETE` | `/api/products/{id}` | Employee+ | Deactivate a product |
| `POST` | `/api/products/image` | Employee+ | Upload a product image |

### Cart

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/cart/{customerId}` | Authenticated (owner only) | Retrieve active cart |
| `POST` | `/api/cart/{customerId}` | Authenticated (owner only) | Add item to cart |

### Checkout and Orders

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/checkout` | Authenticated | Reserve inventory, create order, return Stripe PaymentIntent `client_secret` |
| `POST` | `/api/orders/{orderId}/complete` | Authenticated | Record delivery address, transition order to PAID, deduct inventory, clear cart |
| `GET` | `/api/orders` | Authenticated | List the caller's order history |
| `POST` | `/api/payments` | Authenticated | Alias: creates a checkout session and returns the PaymentIntent directly |

### Customer Profile and Addresses

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/customers/{userId}/profile` | Authenticated | Get profile, addresses, and preferences |
| `POST` | `/api/customers/{userId}/profile` | Authenticated | Create or update profile (substitution preference, notes, default address) |
| `POST` | `/api/customers/{userId}/addresses` | Authenticated | Add a new saved address |
| `PUT` | `/api/customers/{userId}/addresses/{addressId}` | Authenticated | Update a saved address |
| `PUT` | `/api/customers/{userId}/default-address` | Authenticated | Set the default address |
| `DELETE` | `/api/customers/{userId}/addresses/{addressId}` | Authenticated | Remove a saved address |

### Inventory

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/inventory` | Authenticated | List all products with on-hand, reserved, and available counts |
| `PUT` | `/api/inventory/{productId}` | Employee+ | Update the on-hand quantity for a product |

### Delivery

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/delivery/mine` | Authenticated | List the caller's active and past delivery trips |
| `POST` | `/api/delivery/validate-zone` | Authenticated | Validate that an address is within the delivery zone |
| `GET` | `/api/delivery/{tripId}/status` | Authenticated | Get trip status and per-stop ETAs (customers scoped to own orders; staff see all) |
| `POST` | `/api/delivery/{tripId}/complete` | Authenticated | Mark an individual stop as delivered |

### Admin and Fleet

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/admin/orders` | Employee+ | List all orders with status |
| `GET` | `/api/admin/orders/{orderId}` | Employee+ | Get full detail for one order |
| `GET` | `/api/admin/robots` | Employee+ | List all robots with current status and location |
| `PATCH` | `/api/admin/robots/{robotId}/location` | Manager+ | Update a robot's GPS coordinates |
| `GET` | `/api/admin/dispatch/pending` | Employee+ | List PAID orders awaiting dispatch and current fleet state |
| `POST` | `/api/admin/dispatch/confirm` | Employee+ | Dispatch a set of grouped orders to a robot |
| `POST` | `/api/admin/dispatch/auto` | Employee+ | Auto-dispatch orders that have exceeded the wait threshold |
| `GET` | `/api/admin/trips/{tripId}` | Employee+ | Get full trip detail including route polyline and stops |
| `GET` | `/api/admin/revenue` | Employee+ | Get revenue analytics and sales metrics |

### Health

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/health` | Public | Service liveness check |

---

## 5. Database Design

### 5.1 Integrity Constraints and Design Rules

**No Overselling**
During checkout, inventory rows are locked using `SELECT FOR UPDATE` within a transaction. Available stock is computed as `QuantityInStock − ReservedQty` and the reservation is applied only if sufficient stock exists for every item in the cart. If any item is unavailable the entire transaction is rolled back and the caller receives an error.

**Atomic Checkout**
Inventory reservation, order creation, and order line insertion occur within a single database transaction. A failure at any step rolls back all changes, preventing states such as reserved inventory without a corresponding order.

**Checkout-Only Address Capture**
The delivery address is stored inline on the `Order` record (not as a foreign key to `CustomerAddress`) when the order is completed. Subsequent changes to a customer's saved addresses do not alter historical order records.

**Historical Snapshot Accuracy**
Product price and weight are snapshotted into `CartItem` at insertion time (`UnitPriceSnap`, `UnitWeightSnap`) and copied into `OrderLine` at checkout. These values are immutable once the order is confirmed, ensuring historical totals remain accurate even if catalog data changes.

**Payment Authority**
An order is eligible for delivery scheduling only after its status transitions to `PAID`. The transition to `PAID` is triggered by a successful call to `POST /api/orders/{orderId}/complete`, which confirms that the Stripe PaymentIntent was fulfilled on the frontend.

**Robot Exclusivity**
A robot may be assigned to at most one active trip at a time. The dispatch workflow checks for an `IDLE` robot before creating a trip and sets the robot's status to `DISPATCHED` atomically within the same transaction. Dispatch fails gracefully if no `IDLE` robot is available.

**Order Status Transitions**

```
Forward path:   INPROGRESS → PAID → DISPATCHED → DELIVERED
Lateral exits:  INPROGRESS | PAID → VOID      (cancelled before dispatch)
                PAID              → REFUNDED   (payment reversed)
Reverse transitions are not permitted.
```

**Referential Integrity**
Foreign key constraints enforce valid relationships across the ordering workflow, including links between orders, order lines, inventory, payments, trip stops, and robots. This prevents orphaned records and ensures all operational data remains internally consistent.

### 5.2 Key Schema Decisions

**Unified User Table**
All user types (customer, employee, manager, superadmin) are stored in a single `User` table with a `Role` ENUM discriminator. This eliminates join complexity for authentication and simplifies role-based queries.

**Separate `CustomerProfile` and `CustomerAddress`**
Customer-specific preferences and saved addresses are stored in dedicated tables rather than on the `User` record. This keeps the core user table lightweight and allows multiple saved addresses per customer with a designated default.

**Inline Address on Orders**
Rather than a foreign key to `CustomerAddress`, order records store address fields directly. This ensures delivery records are immutable even if the customer later updates or deletes the source address.

**Inventory Reserved Quantity**
Maintaining `ReservedQty` separately from `QuantityInStock` allows the system to express committed but not yet finalized stock without decrementing physical counts until payment is confirmed. This supports atomic rollback on payment failure.

**`DeliveryTrip` Route Geometry**
Each trip stores the full Google Maps polyline alongside `OriginLat`, `OriginLng`, `DestLat`, `DestLng`, `DistanceM`, and `DurationSec`. This enables the frontend to render the route on a map and display accurate ETAs without re-querying the Maps API on each page load.

---

## 6. Deployment

### 6.1 Containers

Each major runtime component runs in its own Docker container orchestrated by Docker Compose:

| Container | Responsibility |
|-----------|---------------|
| Frontend | Builds and serves the compiled React application |
| Apache Gateway | Serves static frontend assets; reverse-proxies all `/api/*` requests to the backend |
| Backend | Flask API implementing all business logic |
| Database | MySQL instance with a persistent named volume |

### 6.2 Networking

Apache is the sole public entry point. All other containers communicate over an internal Docker bridge network.

```
Client → Apache (public) → Backend Flask (internal) → MySQL (internal)
```

Only the Apache container exposes a public port. The backend and database are not reachable from outside the Docker network.

### 6.3 Environment Configuration

All runtime secrets and configuration values are provided through environment variables, never hardcoded:

| Variable | Scope |
|----------|-------|
| `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | Backend |
| `JWT_SECRET` | Backend |
| `STRIPE_API_KEY` | Backend |
| `GOOGLE_MAPS_API_KEY` | Backend |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Frontend (build-time) |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Frontend (build-time) |

### 6.4 Startup Order

1. MySQL container initializes and applies the schema.
2. Backend container runs pending migrations and starts the Flask API.
3. Apache container starts and begins proxying requests.

### 6.5 Database Persistence and Migrations

The MySQL container uses a Docker named volume so data survives container restarts and rebuilds. Schema changes are applied through numbered migration scripts in `/database/migrations/`. Migrations are applied in sequence at startup, before the API begins accepting traffic, to ensure schema and application code remain in sync.

---

## 7. Backlog

[Sprint Backlog Spreadsheet](https://docs.google.com/spreadsheets/d/1cb76vwPRcJc7QnOCP-g4VJSyPkgmQvEE0vILvYXhkU8/edit?usp=sharing)
