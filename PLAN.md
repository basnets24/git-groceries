## Major TODOs

### Customer Experience
1. Add profile + address edit forms (currently read-only) and surface client-side validation/errors.
2. Improve catalog presentation (product imagery, richer cards) and finish the About page content.

### Admin & Staff Tools
1. Wire the admin dashboard cards (inventory, orders, payments, delivery) to real endpoints; ensure routes enforce `roles_required`.
2. Build staff views for order fulfillment and delivery monitoring.

### Checkout / Payments / Delivery
1. Implement checkout workflow: convert cart → order, handle reservations, persist state.
2. Integrate Stripe (payment intents, webhooks, reconciliation) via `integrations/stripe`.
3. Use Google Maps client for delivery routing + ETA, and expose scheduling UI + APIs.

### Platform & Ops
1. Access control audit + automated tests verifying customer/admin separation.
2. Observability: structured logging around integrations, error alerts.
3. Documentation refresh (`README.md`, `endpoints.md`) when new APIs stabilize.
