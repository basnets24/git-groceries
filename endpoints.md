# OFS API Endpoints

Base URL: `http://localhost:5001`

## Health
- `GET /api/health` — Health check endpoint used by monitors and load balancers.

## Authentication
- `POST /api/auth/login` — Authenticate with username/email and password to receive a JWT.
- `POST /api/auth/register` — Create a customer account with username, email, and password.
- `GET /api/auth/me` — Return the profile embedded in the bearer token.
- `GET /api/auth/users?email={query}` — (Manager/Superadmin) Search users by partial email match.
- `PUT /api/auth/users/{userId}/role` — (Manager/Superadmin) Assign MANAGER or EMPLOYEE to a user.

## Products
- `GET /api/products` — Fetch all active products.
- `POST /api/products` — Create a new product and seed its inventory row.

## Inventory
- `GET /api/inventory` — List inventory with product/category metadata.
- `PUT /api/inventory/{productId}` — Update on-hand quantity for a product.

## Cart
- `GET /api/cart/{customerId}` — Retrieve the active cart for a customer.
- `POST /api/cart/{customerId}` — Add or increment a product in the customer's cart.

## Customer Profiles & Addresses
- `GET /api/customers/{userId}/profile` — Fetch profile, preferences, and saved addresses.
- `POST /api/customers/{userId}/profile` — Update substitution notes or default address reference.
- `POST /api/customers/{userId}/addresses` — Add a new delivery address.
- `PUT /api/customers/{userId}/addresses/{addressId}` — Edit an existing delivery address.
- `PUT /api/customers/{userId}/default-address` — Promote an address to default.
- `DELETE /api/customers/{userId}/addresses/{addressId}` — Remove a delivery address.
