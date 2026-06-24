# Stage 16 Menu-To-Cart Review

Date: 2026-06-24

## Scope

This step moves FoodPilot closer to store ordering by adding a one-shot backend flow:

- accept a user and selected menu dishes;
- generate a grocery list from recipes and servings;
- build a mock-store cart from that grocery list;
- return both the readable grocery list and cart for user confirmation.

## Graphify Context

Graphify CLI was not available in this runtime. Existing Graphify review notes were used before edits:

- `docs/stage-7-review.md`
- `docs/stage-8-review.md`
- `docs/stage-9-review.md`
- `docs/architecture.md`

Related files inspected before implementation:

- `apps/api/src/grocery-lists/*`
- `apps/api/src/store-adapters/*`
- `apps/api/src/cart-builder/*`
- `apps/api/test/cart-builder.service.spec.ts`

## API Route

- `POST /cart-builder/menu/cart`
- `POST /cart-builder/carts/:cartId/confirm`

The endpoint accepts:

- `userId`;
- `menu.title`;
- `menu.storeCode`;
- `menu.dishes[]` with dish slug and servings.

It returns:

- generated grocery list;
- prepared cart with selected store products, replacements, package quantities, subtotal, and `requiresConfirmation=true`.

The confirmation endpoint marks the FoodPilot cart as confirmed after user review. It does not place, pay for, or submit an external store order.

## Safety

- No order is submitted.
- No payment is attempted.
- Newly built carts remain `READY_FOR_CONFIRMATION` until explicit user confirmation.
- The cart can only move to `CONFIRMED` through the explicit confirmation endpoint.
- The flow uses the existing grocery-list and cart-builder services instead of coupling store adapters to recipes.

## Verification

Passed:

- `npm run format`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `npm run format:check`
- `npm audit --audit-level=high`

Audit note: moderate transitive advisories remain in dev/mobile/web dependencies and require breaking or forced upgrades.

## Self-Review

- The new endpoint is intentionally orchestration-only.
- Store-specific behavior remains behind the existing adapter/cart boundaries.
- Future real-store adapters can reuse this route after replacing `storeCode` with adapters such as Lenta or Ozon Fresh.
- The next important step is a real store adapter contract for checkout handoff, still gated by explicit user confirmation.
