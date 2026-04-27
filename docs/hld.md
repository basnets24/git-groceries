# OFS Food Delivery Service — High-Level Design Document

**Group #4**
Members: Sneha Basnet, Diya Dalal, Ansh Dhakalia, Kaizan Satta, Andy Van, Victoria Vo

CS160 Software Engineering
San Jose State University
Instructor: Frank Butt
Submission Date: February 18, 2025

---

## 1.1 System Overview

The OFS platform is a web-based ordering and autonomous delivery management system designed for a local organic food retailer in Downtown San Jose. The system enables customers to browse products, place online orders, make payments, and track deliveries, while also providing employees and managers with tools to maintain inventory and oversee operations. The system is deployed as a modular backend application with a relational database and web-based frontend, emphasizing correctness, traceability, and operational simplicity.

---

## 1.2 Architecture Drivers

The architecture is shaped by the following functional and operational needs:

- **Inventory correctness:** Orders must not oversell limited stock.
- **Weight-aware pricing:** Delivery costs depend on cumulative order weight.
- **Robot delivery constraints:** Trips must respect weight and order limits.
- **Multi-role access:** Customers, employees, managers, and superadmins require different permissions.
- **External integrations:** Payments and routing rely on third-party services.

These requirements favor a design that emphasizes transactional integrity, clear module ownership, and centralized business workflows.

---

## 1.3 Architectural Style

The OFS platform follows a layered modular architecture consisting of three logical layers:

| Layer | Responsibility |
|-------|---------------|
| **Presentation Layer** | The React frontend renders the storefront, dashboards, and tracking views. It communicates exclusively through REST APIs. |
| **Application Layer** | The backend service implements business logic and workflow orchestration. Internally it is divided into modules, each responsible for its own domain logic and database tables. |
| **Persistence Layer** | A MySQL relational database serves as the system of record for all business data, including users, products, orders, inventory, payments, and delivery scheduling. |

---

## 1.4 Components and Architecture Diagram

The OFS platform consists of five major runtime components: the React frontend, the Apache gateway, the modular backend application, the MySQL database, and external service providers for payments and mapping.

The React application is responsible for rendering product listings, carts, dashboards, and delivery tracking views. It communicates with the backend exclusively through REST APIs. Apache serves the frontend and forwards all API requests to the backend application. The backend application implements business logic through the following modular components:

- Identity and Access Management
- Customer profile and address management
- Product catalog management
- Shopping cart handling
- Checkout and order processing
- Inventory control
- Payment processing
- Delivery scheduling and routing
- Robot fleet management

Each module owns its domain logic and interacts with others through defined interfaces. The backend interacts with the MySQL database for persistence, with Stripe for payment processing, and with Google Maps for geocoding and route optimization. This structure ensures that presentation, business logic, and data persistence remain separated while allowing communication in a single deployment unit.

![System Architecture Diagram](architecture_diagram.png)

---

## 1.5 Module Descriptions

The OFS backend is organized into modular components that align with the system's core business capabilities. Each module encapsulates its own domain logic and data responsibilities, which helps keep concerns separated and reduces duplicated business rules as workflows span multiple areas of the system.

### Identity and Access Management

This module manages user authentication and role-based authorization across all four roles: customer, employee, manager, and superadmin. All users are stored in a single unified user table with a role discriminator rather than separate tables per role. Superadmins may additionally update user roles through a protected endpoint.

### Customer Profile and Address Management

This module maintains each customer's profile information, including saved delivery addresses, a designated default address, substitution preferences, and special delivery notes. Saved addresses are stored independently of order records so that customers can reuse them across orders. A default address is surfaced during checkout to reduce friction for repeat customers.

### Product Catalog Management

This module supports product browsing, categorization, and search, and it provides protected capabilities for employees and managers to create, update, or deactivate catalog items, including image management.

### Shopping Cart Handling

This module maintains each customer's cart state by tracking selected items and quantities, and it stores price and weight snapshots at insertion time to keep checkout totals consistent even if product data changes later.

### Checkout and Order Processing

This module orchestrates the checkout workflow by computing order totals and delivery fees, creating order records with address fields captured inline, coordinating inventory reservation, and initiating payment processing.

### Inventory Control

This module is the source of truth for stock integrity. It updates on-hand and reserved quantities and enforces concurrency-safe reservation logic so that the system cannot oversell inventory.

### Payment Processing

This module integrates with Stripe, records transaction outcomes, and drives order state transitions based on payment success or failure.

### Delivery Scheduling and Routing

This module batches paid orders into robot delivery trips while enforcing capacity constraints. It integrates with Google Maps to compute optimized routes and stores the full route polyline, origin and destination coordinates, total distance in meters, and estimated duration in seconds for each trip. Individual trip stops each carry their own estimated arrival time for per-order delivery visibility.

### Robot Fleet Management

This module tracks the state of each delivery robot in the fleet. Robots transition through four states: **IDLE**, **DISPATCHED**, **RETURNING**, and **OFFLINE**. When a trip is dispatched, this module assigns a robot, updates its status, and records the associated trip. When a trip completes, the robot is marked as returning and eventually reset to idle. Managers and admins can view fleet status, initiate dispatch, and monitor active trips through the admin dashboard.

---

## 1.6 Core Workflows

### 1.6.1 Customer Experience and Workflow

The customer workflow begins when a user accesses the website and browses the product catalog. The catalog module provides product listings, categories, and search results, including price and weight information. When a customer adds an item to the cart, the cart module stores the product reference along with quantity, price snapshot, and weight snapshot. Storing snapshots ensures that checkout remains consistent even if product attributes change later.

Before checkout, customers can manage their profile to save delivery addresses and designate a default. A default address is pre-populated at checkout so repeat customers do not need to re-enter their address each time. Customers may also set substitution preferences and delivery notes on their profile, which are visible to employees when preparing orders.

During checkout, the ordering module calculates the total order weight by summing item weights multiplied by quantities. It then applies the delivery pricing rule: orders under twenty pounds receive free delivery, while heavier orders incur a fixed ten-dollar delivery fee. The ordering module then requests inventory reservation from the inventory module. This reservation occurs inside a database transaction to prevent concurrent checkouts from overselling limited stock.

If inventory reservation succeeds, the ordering module creates the order record with the delivery address captured inline and initiates payment processing through Stripe. Successful payments transition the order to a **PAID** state, while failed payments release reserved inventory and cancel the order.

After payment confirmation, the delivery module becomes responsible for scheduling the order. Orders are grouped into delivery trips according to robot capacity constraints — at most ten orders and two hundred pounds per trip. When multiple orders are ready, the delivery module requests route information from Google Maps and computes an optimized stop order that minimizes travel time while considering traffic. The full route polyline, total distance, total duration, and per-stop estimated arrival times are stored and used to track delivery progress.

Orders progress through the following states:

| Status | Meaning |
|--------|---------|
| **INPROGRESS** | Order is being assembled |
| **PAID** | Payment confirmed, awaiting dispatch |
| **DISPATCHED** | Assigned to a robot trip |
| **DELIVERED** | Order received by customer |
| **VOID** | Cancelled before dispatch |
| **REFUNDED** | Payment reversed after completion |

### 1.6.2 Employee and Manager Workflow

Employees and managers use the same frontend with RBAC-protected dashboards to search inventory, view on-hand, reserved, and available counts, and perform stock adjustments. Employees can update inventory counts and manage product data including creating, updating, or deactivating catalog items. Managers have full access to everything employees can do and additionally access revenue analytics and fleet management controls. Superadmins retain all manager capabilities and can also reassign user roles.

The dashboard also includes operational visibility into orders and trips. Staff can view which orders are awaiting scheduling, which trips are planned, and which deliveries are in progress. This visibility allows employees to intervene if problems occur, such as inventory shortages or delivery delays.

### 1.6.3 Delivery Scheduling and Optimization Workflow

Delivery scheduling operates as a managed process within the backend application. The scheduler scans for paid orders that have not yet been assigned to a trip. It groups nearby orders together while enforcing both the maximum order count and total weight constraints. Once a group is selected, the scheduler calls Google Maps to obtain geocoded coordinates and traffic-aware travel times. The resulting trip record stores the full route polyline, origin and destination coordinates, distance in meters, and duration in seconds. A robot is pulled from the IDLE pool and assigned to the trip; its status transitions to **DISPATCHED**. When the trip is marked complete, the robot is set to **RETURNING** and eventually back to **IDLE** so it is available for the next trip.

---

## 1.7 Data Architecture

All persistent information is stored in MySQL. The persistence layer organizes application data into domain-driven entities that reflect the system's operational workflows. The schema includes tables for users and roles, customer profiles and addresses, products with weight attributes, carts and cart items, inventory quantities, orders with inline address capture, payment transactions, delivery trips with full route geometry, and the robot fleet. This centralized storage supports reporting, auditing, and operational consistency.

Transactions play a critical role in ensuring correctness. Inventory reservation, order creation, and payment confirmation are executed within transactional boundaries so that failures cannot leave the system in an inconsistent state. This is particularly important because multiple customers may attempt to purchase the same limited inventory simultaneously.

### 1.7.1 Core Entities

#### Identity and Access

```
User(UserID, Username, PasswordHash, Email, Role)
  Role ∈ {CUSTOMER, EMPLOYEE, MANAGER, SUPERADMIN}
```

#### Customer Profile and Delivery Data

```
CustomerProfile(UserID, DefaultAddressID, SubstitutionPreference, Notes)
CustomerPreference(CustomerPreferenceID, UserID, PreferenceType, PreferenceValue)
CustomerAddress(CustomerAddressID, UserID, StreetLine1, StreetLine2, City, State, PostalCode, IsDefault)
```

#### Catalog and Inventory

```
Product(ProductID, Name, Price, WeightLbs, CategoryID, ImageURL, IsActive)
ProductCategory(ProductCategoryID, Name, Description)
Inventory(ProductID, QuantityInStock, ReservedQty)
```

#### Shopping Cart

```
Cart(CartID, CustomerID, Status, UpdatedAt)
CartItem(CartItemID, CartID, ProductID, Quantity, UnitPriceSnap, UnitWeightSnap)
```

#### Ordering

```
Order(OrderID, CustomerID, StreetLine1, StreetLine2, City, State, PostalCode,
      Timestamp, SubtotalPrice, TotalWeight, DeliveryFee, TotalCharge,
      Status, ReadyForDispatchAt)
  Status ∈ {INPROGRESS, PAID, DISPATCHED, DELIVERED, VOID, REFUNDED}

OrderLine(OrderLineID, OrderID, ProductID, Quantity, UnitPrice, UnitWeight, LineTotal)
```

#### Payments

```
Payment(PaymentID, OrderID, Provider, Amount, Status, ProviderReference, Timestamp)
  Status ∈ {PENDING, SUCCESS, FAILED, REFUNDED}
```

#### Robot Fleet

```
Robot(RobotID, Label, Status, CurrentLat, CurrentLng, CurrentTripID, ReturnETA)
  Status ∈ {IDLE, DISPATCHED, RETURNING, OFFLINE}
```

#### Delivery Planning

```
DeliveryTrip(TripID, RobotID, Status, Polyline,
             OriginLat, OriginLng, DestLat, DestLng,
             DistanceM, DurationSec, Timestamp)

TripStop(TripStopID, TripID, OrderID, StopIndex, ETA)
```

> **Figure:** Core ER Diagram

### 1.7.2 Integrity Constraints and Design Rules

| Rule | Description |
|------|-------------|
| **No overselling** | The system tracks reserved quantity and enforces non-negative available stock during concurrent checkouts. |
| **Atomic checkout** | Checkout is transactional so failures cannot reserve inventory without creating an order. |
| **Historical accuracy** | Order totals and item price/weight snapshots are immutable once confirmed. Order address fields are captured inline at checkout so changes to a customer's saved addresses do not affect past orders. |
| **Payment authority** | Payment records determine whether an order is PAID and eligible for delivery scheduling. |
| **Robot exclusivity** | A robot may be assigned to at most one active trip at a time. Dispatch is blocked if no IDLE robot is available. |
| **Order status transitions** | Orders advance forward through `INPROGRESS → PAID → DISPATCHED → DELIVERED`. Lateral transitions to VOID or REFUNDED are only permitted before a robot is dispatched. |

---

## 1.8 Technology Stack

### Runtime Platforms

| Component | Technology |
|-----------|-----------|
| Client | Modern web browsers (Chrome, Firefox) over HTTPS |
| Server OS | Linux or Windows (containerized deployment supported) |

### Core System Components

| Component | Technology |
|-----------|-----------|
| Frontend | React (HTML/CSS/TypeScript) — storefront, dashboards, and tracking UI |
| Web Server | Apache HTTP Server — static asset hosting and API reverse proxy |
| Backend | Python / Flask API |
| Database | MySQL |

### External APIs and Integrations

| Integration | Purpose |
|-------------|---------|
| **Stripe** | Payment processing and PaymentIntent management |
| **Google Maps API** | Geocoding, delivery zone validation, traffic-aware distance matrix, route optimization and polyline generation |

### Development Tools

- **Version Control & Collaboration:** GitHub repository
- **Project Management:** Scrum-style Agile workflow with sprint tracking

---

## 1.9 Deployment and Runtime Environment

For local demonstration, the OFS platform is deployed as a small set of Docker containers that run together as one system. Apache serves as the entry point, hosting the web frontend and reverse-proxying API requests to the backend application service. The backend connects to a MySQL database container configured with persistent storage so data is retained across restarts. Configuration such as database connection settings and external API credentials is provided through environment variables. Docker Compose is used to orchestrate these containers, ensuring the full stack can be started reliably and consistently for demos and testing.

---

## 1.10 Conclusion

This design provides a practical and reliable architecture for OFS's online ordering and robot delivery needs, emphasizing modularity, correctness, and traceability. Core workflows such as cart updates, checkout, inventory reservation, payment recording, delivery trip scheduling, and robot fleet management are implemented as explicit application workflows rather than scattered across UI code and endpoints. Data integrity is enforced through a structured MySQL relational model and transactional handling of concurrency-sensitive operations such as inventory reservation. The robot fleet module adds operational control over autonomous delivery assets, and the customer profile module reduces friction for repeat customers while surfacing preferences to fulfillment staff. Overall, the architecture remains simple to deploy and reason about in a class setting, while still supporting real operational constraints including traffic-aware routing, weight-based pricing rules, robot fleet state management, and employee-facing inventory management.
