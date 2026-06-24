# Stage 21 Page Parser Store Review

## Scope

Stage 21 adds the first page-parser fallback for stores that do not provide an official API.

The first target is VkusVill public search pages:

- `GET /store-adapters/page/vkusvill/search?query=фарш`

The endpoint returns parsed product candidates, prices when visible in HTML, categories, product URLs, and image URLs.

## Graphify Context

Graphify CLI was not available in this runtime. Existing architecture notes were checked before edits:

- `docs/architecture.md`
- `docs/stage-8-review.md`
- `docs/stage-16-menu-to-cart-review.md`
- `docs/stage-19-instacart-review.md`
- `docs/stage-20-production-instacart-review.md`

Relevant constraints:

- store integrations must never place or pay for orders without explicit user confirmation;
- browser/page parsing must stay behind adapter boundaries;
- external store sessions and sensitive data must not be logged.

## Implementation

- Added `PageStoreAdapter`.
- Added parsed store response types.
- Added `PageStoreAdaptersController`.
- Added VkusVill public search parsing:
  - product id;
  - name;
  - category;
  - price text and cents;
  - product URL;
  - image URL;
  - availability hint from page markup.

## Safety

- The parser only reads public pages.
- It does not log cookies, credentials, or payment data.
- It does not add products to a real store cart.
- It does not submit or pay for orders.
- Lenta and Perekrestok showed anti-bot pages on direct HTTP checks; they should be handled later with Playwright and explicit user-owned browser sessions, not silent scraping.

## Verification

Commands run for this stage:

- `npm run format`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `npm run format:check`
- `npm audit --audit-level=high`

Runtime smoke test:

- `curl http://127.0.0.1:3004/store-adapters/page/vkusvill/search?query=фарш`

The runtime smoke test parsed 12 VkusVill products from the public search page, including product names, categories, prices in rubles, product URLs, image URLs where present, and availability hints.
