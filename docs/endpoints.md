# OFS API Endpoints

Base URL: `http://localhost:5001`

Auth notes:
- Endpoints marked `(Auth)` require `Authorization: Bearer <JWT>`.
- Role-restricted endpoints list allowed roles in parentheses.

## Health
- `GET /api/health` — Health check endpoint used by monitors and load balancers.

## Authentication
- `POST /api/auth/login` — Authenticate with username/email and password to receive a JWT.
- `POST /api/auth/register` — Create a customer account with username, email, and password.
- `GET /api/auth/me` — (Auth) Return the profile embedded in the bearer token.
- `GET /api/auth/users?email={query}` — (MANAGER/SUPERADMIN) Search users by partial email match.
- `PUT /api/auth/users/{userId}/role` — (MANAGER/SUPERADMIN) Assign `MANAGER` or `EMPLOYEE` to a user.

## Products
- `GET /api/categories` — (Auth) Fetch product categories.
- `GET /api/products` — (Auth) Fetch active products; supports optional filters:
  - `category_id` (repeatable)
  - `min_price`, `max_price`
  - `min_weight`, `max_weight`
- `POST /api/products` — (EMPLOYEE/MANAGER/SUPERADMIN) Create a product and seed inventory quantity.
- `DELETE /api/products/{productId}` — (EMPLOYEE/MANAGER/SUPERADMIN) Deactivate a product.
- `POST /api/products/image` — (EMPLOYEE/MANAGER/SUPERADMIN) Upload product image (`multipart/form-data`, field: `image`).
- `GET /images/{filename}` — Serve an uploaded product image.

## Inventory
- `GET /api/inventory` — (Auth) List inventory with product/category metadata.
- `PUT /api/inventory/{productId}` — (EMPLOYEE/MANAGER/SUPERADMIN) Update on-hand quantity for a product.

## Cart
- `GET /api/cart/{customerId}` — (Auth) Retrieve the active cart for a customer.
- `POST /api/cart/{customerId}` — (Auth) Add or increment a product in the customer's cart.

## Customer Profiles & Addresses
- `GET /api/customers/{userId}/profile` — (Auth) Fetch profile, preferences, and saved addresses.
- `POST /api/customers/{userId}/profile` — (Auth) Create or update substitution preferences/notes/default address.
- `POST /api/customers/{userId}/addresses` — (Auth) Add a new delivery address.
- `PUT /api/customers/{userId}/addresses/{addressId}` — (Auth) Edit an existing delivery address.
- `PUT /api/customers/{userId}/default-address` — (Auth) Promote an address to default.
- `DELETE /api/customers/{userId}/addresses/{addressId}` — (Auth) Remove a delivery address.

## Checkout
- `POST /api/checkout` — (Auth) Initialize checkout session for the active cart.
  - Returns order summary with subtotal, total weight, delivery charge (free if < 20 lbs, $10 if ≥ 20 lbs), and Stripe payment intent details.
- `POST /api/orders/{orderId}/complete` — (Auth) Mark an order as completed after successful payment.

## Payments (Stripe)
- `POST /api/payments` — (Auth) Create a Stripe payment intent for checkout.
  - Returns Stripe `PaymentIntent` with `client_secret` for client-side confirmation.
  - Payment records are persisted in the database with `PENDING` status.

## Orders
- `GET /api/orders` — (Auth) Fetch all completed orders for the authenticated customer.
  - Returns order history with items, addresses, payment status, and dates.

## Delivery
- `GET /api/delivery/mine` — (Auth) Fetch deliveries associated with the authenticated user plus pending dispatch items.
- `POST /api/delivery/validate-zone` — (Auth) Validate whether an address is within the delivery zone.
- `POST /api/delivery/{tripId}/complete` — (Auth) Mark one order on a trip as completed.
- `GET /api/delivery/{tripId}/status` — (Auth) Fetch current trip status.

## Admin
- `GET /api/admin/orders` — (EMPLOYEE/MANAGER/SUPERADMIN) List all orders.
- `GET /api/admin/orders/{orderId}` — (EMPLOYEE/MANAGER/SUPERADMIN) Fetch one order in detail.
- `GET /api/admin/robots` — (EMPLOYEE/MANAGER/SUPERADMIN) List robot fleet and status.
- `PATCH /api/admin/robots/{robotId}/location` — (MANAGER/SUPERADMIN) Update robot coordinates.
- `GET /api/admin/dispatch/pending` — (EMPLOYEE/MANAGER/SUPERADMIN) List pending dispatch groups.
- `POST /api/admin/dispatch/confirm` — (EMPLOYEE/MANAGER/SUPERADMIN) Confirm manual dispatch groups.
- `POST /api/admin/dispatch/auto` — (EMPLOYEE/MANAGER/SUPERADMIN) Trigger automatic dispatch for expired windows.
- `GET /api/admin/trips/{tripId}` — (EMPLOYEE/MANAGER/SUPERADMIN) Fetch trip detail.
- `GET /api/admin/revenue` — (EMPLOYEE/MANAGER/SUPERADMIN) Fetch revenue summary/detail.
