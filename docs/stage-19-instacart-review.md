# Stage 19 Instacart Review

## Scope

Stage 19 adds the first real grocery-store integration path. FoodPilot can turn an existing grocery list into an Instacart shopping-list checkout link through the Instacart Developer Platform.

This is a redirect integration, not silent ordering. The user must review retailer choice, substitutions, delivery slot, and payment in Instacart before any real order is placed.

## Graphify Context

Graphify CLI was not available in this runtime. Existing Graphify review notes and architecture constraints were checked before edits:

- `docs/architecture.md`
- `docs/stage-8-review.md`
- `docs/stage-16-menu-to-cart-review.md`
- `docs/stage-17-checkout-payment-review.md`
- `docs/stage-18-web-cockpit-review.md`

Relevant constraints:

- store integrations must never place or pay for orders without explicit user confirmation;
- cart-building logic must stay separate from provider-specific store behavior;
- secrets must live in environment variables and never in source code.

## Implementation

- Added `ExternalStoresModule` under `apps/api/src/external-stores`.
- Added `InstacartDeveloperAdapter` with:
  - status check;
  - nearby-retailer lookup by postal code;
  - grocery-list to Instacart shopping-list link creation.
- Added REST routes:
  - `GET /external-stores/instacart/status`
  - `GET /external-stores/instacart/retailers?postalCode=10001&countryCode=US`
  - `POST /external-stores/instacart/grocery-lists/:groceryListId/link`
- Updated the web cockpit with Instacart status and checkout-link actions.
- Documented `INSTACART_API_KEY` and optional `INSTACART_API_BASE_URL`.

## Security Notes

- No Instacart token is committed.
- Missing credentials return a controlled `400` instead of falling back to mock behavior.
- FoodPilot does not collect card data and does not confirm external orders.
- Russian grocery providers remain future work unless official partner APIs or user-authorized browser sessions are available.

## Verification

Commands run for this stage:

- `npm run format`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `npm run format:check`
- `npm audit --audit-level=high`
- `curl http://127.0.0.1:3004/health`
- `curl http://127.0.0.1:3004/external-stores/instacart/status`

`npm audit --audit-level=high` passed without high or critical findings. It still reports existing moderate advisories in transitive Jest, Expo, Next, and `@nestjs/swagger` dependency chains; the suggested automatic fixes require breaking upgrades and are tracked outside this stage.

The live Instacart status endpoint was verified on a fresh API process at port `3004`. With no `INSTACART_API_KEY`, it returns `configured: false` and the required env var instead of pretending that a real checkout is available.

## Self-Review

- The integration is minimal but real: it uses provider credentials and provider checkout rather than local fake checkout.
- The external store boundary is isolated from the mock cart builder.
- The UI clearly shows when Instacart is blocked by missing credentials.
- Real direct order placement and payment remain intentionally out of scope until a provider contract and explicit confirmation flow are available.
