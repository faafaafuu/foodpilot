# Stage 22 Browser Session Store Automation Review

## Scope

Stage 22 defines the safe one-login automation boundary for stores that do not expose a usable buyer API and do not work through direct page parsing.

Target providers:

- Yandex Eda
- Yandex Go
- Pyaterochka
- Magnit

The implementation adds API-visible policy and planning endpoints:

- `GET /store-adapters/browser-session/status`
- `POST /store-adapters/browser-session/automation-plan`

## Graphify Context

Graphify CLI was not available in this runtime. Existing architecture and review notes were checked before edits:

- `docs/architecture.md`
- `docs/stage-16-menu-to-cart-review.md`
- `docs/stage-17-checkout-payment-review.md`
- `docs/stage-19-instacart-review.md`
- `docs/stage-20-production-instacart-review.md`
- `docs/stage-21-page-parser-store-review.md`

Relevant constraints:

- store behavior must stay behind adapter boundaries;
- FoodPilot can prepare carts, but external order submission requires user confirmation;
- real payments must be delegated to provider or payment adapters;
- FoodPilot must not store raw card data, passwords, cookies, or sensitive browser-session material in logs.

## Implementation

- Added `BrowserStoreAutomationPolicyService`.
- Added browser-session automation types for provider capabilities and run plans.
- Added `CreateBrowserAutomationPlanDto`.
- Added browser-session store adapter controller endpoints.
- Registered the policy service in `StoreAdaptersModule`.
- Added unit tests for:
  - provider status;
  - default cart-assembly plan;
  - order submission after fresh exact-cart confirmation;
  - automatic payment rejection.

## Behavior

The one-login model is allowed only as a user-owned browser session:

1. User signs in directly with the provider in a local browser profile.
2. FoodPilot may search products.
3. FoodPilot may assemble the provider cart.
4. User reviews products, replacements, delivery address, and total.
5. If enabled, FoodPilot may submit the external order only after fresh confirmation for this exact cart.
6. Payment stays inside the provider or bank flow.

Automatic payment capture is blocked by API policy. If a client sends `allowPayment: true`, the API returns a bad-request error.

## Safety

- No raw password storage.
- No card data storage.
- No captcha, 3DS, SMS, or bank challenge bypass.
- No hidden external order submission.
- No logging of cookies, tokens, payment data, or delivery addresses.

## Limitations

This stage does not yet drive Playwright. It establishes the enforceable API contract that the Playwright adapter must obey. The next implementation step is to add a Playwright-backed local browser profile manager and connect it to the grocery-list matching flow.

## Verification

Commands run for this stage:

- `npm run format`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `npm run format:check`
- `npm audit --audit-level=high`

Self-review:

- The implementation does not pretend that Pyaterochka, Magnit, or Yandex checkout is already automated.
- The policy is executable and covered by tests.
- The API makes the future browser automation boundary explicit for web/mobile clients.
- The payment boundary remains conservative and aligned with the security checklist.
