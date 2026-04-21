# cs160-sp26-semester-project
Problem statement – New local food retailer chain, “OFS”, in the San Jose Downtown area wants to implement delivery services as part of their business plan. You are responsible for developing the website where customers can purchase organic food online (e.g. fruits, vegetables, and other grocery items) into a virtual shopping cart.

Design doc [here](https://docs.google.com/document/d/1WdLFmX76qNhcSmgcOhBuMyk9vpBDziqBD6mN6q7LATI/edit?tab=t.2mff334vjqmo)

## Backend Error Handling

All API exceptions are centralized in `backend/exceptions.py`. The module exposes:

- `APIError` (and subclasses such as `ValidationError`, `AuthError`, `NotFoundError`, `ConflictError`, `ServiceError`)
- `register_error_handlers(app)` which installs JSON handlers for both `APIError` and uncaught exceptions

Usage guidelines:

1. Raise the most specific `APIError` subclass from routes/services instead of calling `jsonify` directly. Include `extra={...}` details when useful.
2. Call `register_error_handlers(app)` once during app creation (already done in `backend/main.py`). All blueprints automatically get consistent error responses like `{"error": "...", "details": {...}}`.
3. Avoid broad `try/except` inside routes unless you need to transform third-party errors; re-raise as `APIError` so the handler controls the HTTP code.

This keeps error formatting and logging consistent and makes it easier to extend responses (e.g., add error codes) in one place.

## Integrations Scaffold

External services live under `backend/integrations/`. Each provider gets its own package with a simple client stub and config dataclass so future work can flesh out real API calls:

- `integrations/google_maps`: placeholder client (`GoogleMapsClient`) plus config for geocoding/ETA requests.
- `integrations/stripe`: placeholder `StripeClient` for payment intents.

Wire these into modules (checkout, delivery, etc.) once the concrete workflows are defined.

## startup instructions
spin up backend, database, and frontend containers through docker

create stripe api key and paste into .env file
[stripe link](https://dashboard.stripe.com)

in .env, set STRIPE_API_KEY=secret key
in frontend/.env REACT_APP_STRIPE_PUBLISHABLE_KEY = publishable key

make sure to add google_maps key in .env and frontend /.env

example card use: 4242 4242 4242
any date, security number



```
docker compose up --build
```
