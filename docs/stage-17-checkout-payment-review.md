# Stage 17 Checkout Payment Review

Date: 2026-06-24

## Scope

This step adds a checkout and payment-intent layer:

- checkout safety review for prepared carts;
- persistent `PaymentIntent` model;
- provider-neutral `PaymentAdapter` interface;
- `MockPaymentAdapter`;
- mock payment-intent creation for confirmed carts;
- explicit mock capture endpoint.

## Graphify Context

Graphify CLI was not available in this runtime. Existing Graphify review notes were used before edits:

- `docs/stage-8-review.md`
- `docs/stage-9-review.md`
- `docs/stage-13-review.md`
- `docs/stage-16-menu-to-cart-review.md`
- `docs/architecture.md`

Related files inspected before implementation:

- `prisma/schema.prisma`
- `apps/api/src/cart-builder/*`
- `apps/api/src/store-adapters/*`
- `apps/api/src/app.module.ts`
- `apps/api/test/cart-builder.service.spec.ts`

## API Routes

- `GET /checkout/carts/:cartId/review`
- `POST /checkout/carts/:cartId/payment-intents`
- `POST /checkout/payment-intents/:paymentIntentId/confirm`

## Safety

- Payment intent creation requires a cart already marked `CONFIRMED`.
- Current implementation uses mock payments only.
- FoodPilot does not store card data.
- No real money is charged.
- No external store order is submitted.
- Real providers must be implemented as adapters backed by hosted/tokenized provider flows.

## Verification

Passed:

- `npm run prisma:generate`
- `npm run format`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `DATABASE_URL=postgresql://foodpilot:foodpilot@127.0.0.1:15432/foodpilot?schema=public npm run prisma:migrate`
- `npm run format:check`
- `npm audit --audit-level=high`

Audit note: moderate transitive advisories remain in dev/mobile/web dependencies and require breaking or forced upgrades.

## Self-Review

- Checkout orchestration is separate from cart building and store adapters.
- Payment provider details are isolated behind `PaymentAdapter`.
- The database stores only payment-intent metadata, not card data or provider secrets.
- This is the right local foundation before Stripe, YooKassa, CloudPayments, or store-native payment flows.
