# Stage 8 Review

Date: 2026-06-19

## Scope

Stage 8 adds an extensible store adapter layer and the first working adapter:

- `StoreAdapter` interface;
- `MockStoreAdapter`;
- product search;
- product details;
- availability checks;
- add product to draft cart;
- get cart;
- replace product in cart;
- subtotal recalculation.

## Graphify Context

Graphify was updated before edits with:

```bash
GRAPHIFY=/root/job-agent/.venv/bin/graphify make graph
```

The graph was queried for store adapter, store products, carts, cart items, grocery lists, replacement, availability, and order-confirmation constraints. Related files:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `apps/api/src/grocery-lists/*`
- `apps/api/src/app.module.ts`
- `docs/architecture.md`

## API Routes

- `GET /store-adapters/mock/search?query=фарш`
- `GET /store-adapters/mock/products/:productId`
- `GET /store-adapters/mock/products/:productId/availability`
- `POST /store-adapters/mock/cart/items`
- `GET /store-adapters/mock/cart/:cartId`
- `POST /store-adapters/mock/cart/:cartId/replace`

## Safety

- The adapter only creates or updates carts.
- It never confirms, pays for, or submits an order.
- Every cart remains `requiresConfirmation = true`.

## Verification

Passed:

- `npm run format`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `npm run format:check`
- `npm audit --audit-level=high`
- manual API check with local PostgreSQL seed data

Manual API checks:

- `GET /store-adapters/mock/search?query=фарш` returned mock products.
- `GET /store-adapters/mock/products/:productId` returned product details.
- `GET /store-adapters/mock/products/:productId/availability` returned availability.
- `POST /store-adapters/mock/cart/items` created a draft cart with `requiresConfirmation=true`.
- `POST /store-adapters/mock/cart/:cartId/replace` replaced beef mince with turkey mince and preserved replacement metadata.

## Self-Review

- Store-specific logic lives behind `StoreAdapter`, so Lenta/Ozon Fresh adapters can be added without changing cart/recommendation logic.
- Mock cart operations are real database writes and are usable by Stage 9 Cart Builder.
- Replacement records preserve `replacementForName` and `replacementReason` for user review before confirmation.
