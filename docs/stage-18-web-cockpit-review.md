# Stage 18 Web Cockpit Review

Date: 2026-06-24

## Scope

This step turns the web dashboard from a static MVP view into a working browser cockpit:

- create or update the demo FoodPilot profile;
- select dishes for the menu;
- generate a grocery list and mock-store cart;
- confirm the cart;
- create and capture a mock payment intent;
- chat with the local AI adapter;
- use browser speech recognition for voice input when supported;
- speak AI replies through browser speech synthesis when supported.
- show production integration readiness for real stores, payment, and external AI.
- improve the cockpit visual hierarchy, state badges, status strip, and operational layout.

## Graphify Context

Graphify CLI was not available in this runtime. Existing Graphify review notes were used before edits:

- `docs/stage-10-review.md`
- `docs/stage-12-review.md`
- `docs/stage-16-menu-to-cart-review.md`
- `docs/stage-17-checkout-payment-review.md`
- `docs/architecture.md`

Related files inspected before implementation:

- `apps/web/app/page.tsx`
- `apps/web/app/styles.css`
- `apps/api/src/profiles/*`
- `apps/api/src/cart-builder/*`
- `apps/api/src/checkout/*`
- `apps/api/src/ai/*`

## User-Facing Routes

- Web cockpit: `http://localhost:3000`
- Current API docs: `http://localhost:3002/docs`

## Safety

- Checkout still uses mock payment only.
- No real store order is submitted.
- No real card data is collected or stored.
- Voice input uses browser APIs; unsupported browsers keep text chat usable.

## Verification

Passed:

- `npm run format`
- `npm run lint`
- `npm test`
- `npm run build`
- local API smoke test: profile -> menu cart -> cart confirmation -> mock payment capture -> AI message

## Self-Review

- The first viewport now contains the actual product workflow, not a marketing page.
- The UI is wired to existing backend contracts instead of duplicating business logic in the browser.
- The cockpit is intentionally operational and dense for repeated testing of the end-to-end MVP flow.
- Real store checkout remains blocked until a store adapter and payment provider are selected and configured.
- Real integrations are not shown as connected unless credentials and provider configuration exist.
