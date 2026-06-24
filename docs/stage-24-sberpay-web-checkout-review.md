# Stage 24 SberPay Web Checkout Review

## Scope

Stage 24 adds a production-gated SberPay redirect checkout path and makes the web dashboard expose it as the primary payment action.

New API endpoints:

- `GET /checkout/sberpay/status`
- `POST /checkout/carts/:cartId/sberpay-payment-intents`

Web changes:

- visible SberPay integration status;
- SberPay payment-link creation after cart confirmation;
- browser-session store integration status;
- clearer checkout panel and action flow.

## Graphify Context

Graphify CLI was not available in this runtime (`graphify: not found`). Existing architecture and review docs were checked before edits:

- `docs/architecture.md`
- `docs/stage-17-checkout-payment-review.md`
- `docs/stage-20-production-instacart-review.md`
- `docs/stage-22-browser-session-store-automation-review.md`
- `docs/stage-23-playwright-browser-session-review.md`

Relevant constraints:

- real payments must stay behind payment adapters;
- FoodPilot must not store raw card data;
- external provider payment confirmation must not be captured locally;
- carts must be explicitly confirmed before payment-intent creation.

## External Documentation Checked

Sber's developer documentation for the ecommerce gateway says SberPay SDK scenarios obtain `sbolBankInvoiceId` from `register.do` / `registerPreAuth.do` when the request includes the required additional parameters. The documented ecommerce endpoint example uses:

- `ecommerce.sberbank.ru/ecomm/gw/partner/api/v1/register.do`
- JSON payload with `userName`, `password`, `orderNumber`, `amount`, `currency`, `returnUrl`, `failUrl`, and `jsonParams`
- response fields including `orderId`, `formUrl`, and `externalParams`

Source: https://developers.sber.ru/docs/ru/sberpay-sdk/signup/sign-up-ecom

## Implementation

- Added `PaymentProvider.SBERPAY`.
- Added Prisma migration `20260624233000_stage_24_sberpay_provider`.
- Added `SberPayPaymentAdapter`.
- Added `CreateSberPayPaymentDto`.
- Added SberPay status and payment-intent checkout endpoints.
- Updated checkout service:
  - confirmed carts only;
  - existing intent reuse per provider;
  - local capture remains mock-only;
  - SberPay payments must be confirmed by provider status/callback flow later.
- Added SberPay env vars to `.env.example` and Docker Compose.
- Updated web dashboard to show SberPay and browser-session integration status.

## Safety

- SberPay creation is blocked unless:
  - `SBERPAY_ENV=production`;
  - merchant API credentials are present;
  - return/fail URLs are present;
  - gateway URL does not look like a sandbox/test endpoint.
- FoodPilot stores only provider order id, amount, currency, status, and provider payment page URL.
- FoodPilot does not store card data.
- FoodPilot does not capture SberPay locally.

## Limitations

This stage creates the SberPay payment page redirect. It does not yet implement provider callbacks or status polling, so successful payment confirmation is not automatically reconciled back into FoodPilot.

Real production use requires merchant credentials issued by Sber and public return/fail URLs.

## Verification

Commands run for this stage:

- `npm run prisma:generate`
- `npm run format`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `npm run format:check`
- `npm audit --audit-level=high`

Self-review:

- No fake SberPay payment is created without credentials.
- The adapter sends a real `register.do` request when production env is configured.
- Web UI now exposes real integration status instead of only mock payment controls.
- Provider confirmation remains a clear follow-up task.
