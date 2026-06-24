# Stage 20 Production Instacart Review

## Scope

Stage 20 tightens the Instacart integration so the primary app flow is not a test-mode checkout.

FoodPilot now treats Instacart as ready only when all production requirements are present:

- `INSTACART_ENV=production`
- `INSTACART_API_KEY`
- production API base URL `https://connect.instacart.com`

## Graphify Context

Graphify CLI was not available in this runtime. Before edits, the existing architecture and stage review docs were checked:

- `docs/architecture.md`
- `docs/stage-17-checkout-payment-review.md`
- `docs/stage-18-web-cockpit-review.md`
- `docs/stage-19-instacart-review.md`

## Implementation

- Changed Instacart defaults from development to production.
- Added explicit `productionReady` and `missingEnv` fields to the Instacart status response.
- Blocked shopping-list checkout link creation when Instacart is configured for development mode.
- Wired Instacart production env vars into `.env.example` and Docker Compose.
- Changed the web full-flow action to create an Instacart checkout link instead of running mock payment.
- Updated the checkout panel to state that payment happens inside Instacart.

## External API Notes

Official Instacart Developer Platform docs say:

- production keys are separate from development keys;
- production requests use `https://connect.instacart.com`;
- `POST /idp/v1/products/products_link` creates a shopping-list page where users can select a store, add products to cart, and check out.

## Remaining Hard Requirement

This cannot be made live without a real Instacart production API key issued for the app. FoodPilot now has the production wiring and refuses test-mode checkout, but the actual production key must come from the Instacart Developer Dashboard.

## Verification

Commands run for this stage:

- `npm run format`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `npm run format:check`
- `npm audit --audit-level=high`
- `curl http://127.0.0.1:3004/external-stores/instacart/status`
- `curl -X POST http://127.0.0.1:3004/external-stores/instacart/grocery-lists/list-1/link`

The status endpoint returned production mode with `https://connect.instacart.com` and `productionReady: false` because no production API key is configured in this environment. The link endpoint returned HTTP 400 instead of generating any fake checkout.
