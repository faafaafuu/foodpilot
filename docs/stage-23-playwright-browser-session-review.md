# Stage 23 Playwright Browser Session Review

## Scope

Stage 23 adds the first real browser-session runtime layer for stores that require user login.

New endpoints:

- `GET /store-adapters/browser-session/sessions`
- `POST /store-adapters/browser-session/sessions`
- `GET /store-adapters/browser-session/sessions/:sessionId`
- `POST /store-adapters/browser-session/sessions/:sessionId/close`

The API can now create a local Playwright persistent browser context for:

- Yandex Eda
- Yandex Go
- Pyaterochka
- Magnit

## Graphify Context

Graphify CLI was not available in this runtime. Existing architecture and stage notes were checked before edits:

- `docs/architecture.md`
- `docs/stage-21-page-parser-store-review.md`
- `docs/stage-22-browser-session-store-automation-review.md`

Relevant constraints:

- browser sessions must stay local and out of logs;
- FoodPilot must not store raw passwords, card data, or provider cookies in the database;
- checkout/payment must remain user-confirmed.

## Implementation

- Added `playwright` to the API workspace.
- Added `.foodpilot/` to `.gitignore`.
- Added `FOODPILOT_BROWSER_SESSION_DIR` to `.env.example`.
- Added `PlaywrightBrowserStoreDriver`.
- Added `BrowserStoreSessionService`.
- Added DTO and response types for browser-session lifecycle.
- Wired browser-session lifecycle endpoints into `StoreAdaptersModule`.
- Added tests for:
  - opening a provider browser session through a fake driver;
  - closing a session context;
  - returning a `FAILED` session when Playwright cannot open Chromium.

## Runtime Behavior

`POST /store-adapters/browser-session/sessions` creates a provider-specific local profile path and asks Playwright to open the provider login URL. The user signs in directly with the provider in that browser window.

The API response exposes only session metadata:

- FoodPilot session id;
- provider;
- status;
- login URL;
- local profile path;
- current URL;
- capability booleans.

It does not expose cookies, passwords, local storage, payment data, or delivery address content.

## Limitations

This stage does not yet automate DOM selectors for searching products or adding them to a real cart. It opens and manages the browser profile that the next provider-specific adapters will use.

To run this locally, install the Chromium runtime:

```bash
npx playwright install chromium
```

Headed login also requires an environment that can show a browser window. In a headless container, the endpoint returns `FAILED` with the launch error instead of pretending that login is possible.

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

- The implementation uses real Playwright primitives.
- Browser profile paths are local and ignored by git.
- No secret browser-session material is persisted in Prisma.
- The order/payment safety boundary from Stage 22 remains intact.
