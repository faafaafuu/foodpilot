# Stage 25 SberPay Status Reconciliation Review

## Scope

Stage 25 adds on-demand SberPay status polling and local payment-intent reconciliation.

New API endpoint:

- `POST /checkout/payment-intents/:paymentIntentId/sberpay-status`

Web changes:

- visible SberPay payment status;
- action to poll SberPay after the user returns from payment;
- success, pending, cancelled, and failed badges.

## Graphify Context

Graphify CLI was not available in this runtime (`graphify: not found`). Existing architecture and review docs were checked before edits:

- `docs/architecture.md`
- `docs/stage-17-checkout-payment-review.md`
- `docs/stage-24-sberpay-web-checkout-review.md`

Relevant constraints:

- external payment providers are adapter-bound;
- FoodPilot must not locally capture SberPay payments;
- provider payment state must be reconciled through provider APIs or callbacks;
- no card data or provider credentials may be logged.

## External Documentation Checked

Official Sber gateway documentation and SberPay onboarding docs describe `getOrderStatusExtended.do` as the order-status request and `register.do` as the order-registration request used before payment.

Sources:

- https://developers.sber.ru/docs/ru/sberpay-sdk/signup/sign-up-ecom
- https://ecomtest.sberbank.ru/doc

## Implementation

- Added `SberPayPaymentAdapter.getPaymentStatus()`.
- Added provider status response type.
- Added checkout service reconciliation:
  - Sber order status `2` -> local `CAPTURED`;
  - Sber order status `3` or `4` -> local `CANCELED`;
  - Sber order status `6` -> local `FAILED`;
  - other or missing statuses remain `REQUIRES_CONFIRMATION`.
- Added `POST /checkout/payment-intents/:paymentIntentId/sberpay-status`.
- Updated web checkout panel to poll payment status and show the current result.
- Added tests for paid and declined Sber status mapping.

## Safety

- The status endpoint only works for `SBERPAY` payment intents.
- Mock capture remains local-only; SberPay capture remains provider-controlled.
- FoodPilot updates only local metadata: status, confirmation timestamp, and a short status-sync note.
- Sber credentials remain env-only.

## Limitations

This stage implements on-demand polling, not webhook/callback verification. A production system should add Sber callback handling with signature/checksum verification where available and make polling a fallback.

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

- No fake successful payment is produced.
- Paid status requires a provider response from Sber.
- Local payment statuses now move out of `REQUIRES_CONFIRMATION` when Sber reports terminal state.
- The web flow no longer leaves users without a way to check payment status.
