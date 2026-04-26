# cs160-sp26-semester-project

OFS is a local organic food retailer for the San Jose Downtown area. This project provides a full-stack storefront with customer accounts, product browsing, carts, checkout, payments, delivery tracking, and admin tools.

Design doc: [Google Doc](https://docs.google.com/document/d/1WdLFmX76qNhcSmgcOhBuMyk9vpBDziqBD6mN6q7LATI/edit?tab=t.2mff334vjqmo)

## Project Layout

- `backend/` - Flask API, business logic, and integrations
- `frontend/` - React app
- `database/` - Schema, seed data, and migrations
- `apache/` - Reverse proxy configuration
- `tests/` - Test scripts and fixtures

## Quick Start

1. Create a `.env` file at the repository root with the required backend values:

```bash
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=ofs
MYSQL_USER=ofs_user
MYSQL_PASSWORD=ofs_password
JWT_SECRET=your_jwt_secret
STRIPE_API_KEY=your_stripe_secret_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

2. Create `frontend/.env` with the frontend values:

```bash
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

3. Start the stack:

```bash
docker compose up --build
```

4. Open the app:

- Frontend: http://localhost:3000
- API: http://localhost:5001

## Environment Variables

Root `.env`:

- `MYSQL_ROOT_PASSWORD` - MySQL root password
- `MYSQL_DATABASE` - database name
- `MYSQL_USER` - app database user
- `MYSQL_PASSWORD` - app database password
- `JWT_SECRET` - signing key for auth tokens
- `STRIPE_API_KEY` - Stripe secret key
- `GOOGLE_MAPS_API_KEY` - Google Maps API key

`frontend/.env`:

- `REACT_APP_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `REACT_APP_GOOGLE_MAPS_API_KEY` - Google Maps API key for browser features

## Common Commands

```bash
docker compose up --build
docker compose down -v
```

- `up --build` starts the database, backend, frontend, and Apache proxy
- `down -v` stops the stack and removes local volumes, including database data

## Database Setup

- Schema and seed data live in `database/`
- The MySQL container loads the SQL files on first startup
- Migrations live in `database/migrations/`
- If you need a clean reset, run `docker compose down -v` and start the stack again

## API Summary

Common endpoints are documented in [endpoints.md](endpoints.md). Highlights:

- Auth: login, register, current user, and role assignment
- Products: categories, catalog, create/delete, and image upload
- Cart: per-customer cart access
- Checkout and payments: Stripe-backed checkout flow
- Delivery: trip tracking and zone validation
- Admin: orders, robots, dispatch, revenue, and trip detail

## Security Model

- Public endpoints: health check, login, register, and product image serving
- Auth required: most customer-facing reads and writes
- Role required: admin, inventory, product management, and dispatch operations
- Ownership enforced: customer profiles, addresses, carts, and customer trip views are scoped to the authenticated user

## Auth and Roles

- `CUSTOMER` - standard shopper account
- `EMPLOYEE` - staff account with product, inventory, and admin order access
- `MANAGER` - staff account with broader admin and dispatch access
- `SUPERADMIN` - highest privilege level for role management and operations

Protected endpoint categories in [endpoints.md](endpoints.md):

- Auth-only
- Role-protected
- Ownership-protected

## Testing

- Backend tests live under `tests/`
- Shell test scripts are provided for endpoint checks and customer profile flows
- Run tests after starting the stack so the API can reach MySQL and supporting services

Example:

```bash
./tests/test_endpoints.sh
./tests/test_customer_profiles.sh
```

## Integrations

External services live under `backend/integrations/`:

- `integrations/google_maps` - geocoding and routing support for delivery validation and ETA features
- `integrations/stripe` - payment intent support for checkout

## Helpful Test Cards

- Stripe test card: `4242 4242 4242 4242`
- Use any future expiry date and any CVC

## Troubleshooting

- If login or checkout fails, confirm the backend can reach MySQL and that the required API keys are set
- If frontend auth or maps features fail, check `frontend/.env`
- If data looks stale, reset the local database volume with `docker compose down -v`

## Notes

- The API base URL in local Docker runs is `http://localhost:5001`
- The frontend expects the backend, database, and supporting services to be running before login or checkout flows will work
