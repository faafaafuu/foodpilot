import { BadRequestException } from '@nestjs/common';
import { BrowserStoreAutomationPolicyService } from '../src/store-adapters/browser-store-automation-policy.service';

describe('BrowserStoreAutomationPolicyService', () => {
  it('reports one-login browser session providers with payment blocked', () => {
    const service = new BrowserStoreAutomationPolicyService();

    const status = service.getStatus();

    expect(status.providers.map((provider) => provider.provider)).toEqual([
      'yandex-eda',
      'yandex-go',
      'pyaterochka',
      'magnit',
    ]);
    expect(status.globalRules).toContain(
      'FoodPilot must not capture payment or bypass provider bank, 3DS, SMS, or captcha challenges.',
    );
    expect(
      status.providers
        .find((provider) => provider.provider === 'yandex-eda')
        ?.capabilities.find((capability) => capability.code === 'PAYMENT')?.status,
    ).toBe('BLOCKED');
  });

  it('creates a cart-assembly plan that stops before external order submission by default', () => {
    const service = new BrowserStoreAutomationPolicyService();

    const plan = service.createPlan({ provider: 'yandex-eda' });

    expect(plan.allowed).toEqual({
      canSearch: true,
      canAssembleCart: true,
      canSubmitOrder: false,
      canPay: false,
    });
    expect(plan.steps.map((step) => step.code)).toEqual([
      'OPEN_USER_BROWSER_SESSION',
      'SEARCH_PRODUCTS',
      'ASSEMBLE_CART',
      'REVIEW_CART',
      'PROVIDER_PAYMENT_CONFIRMATION',
    ]);
    expect(plan.warnings).toContain('External order submission is disabled for this plan.');
  });

  it('allows order submission only after a fresh exact-cart user confirmation step', () => {
    const service = new BrowserStoreAutomationPolicyService();

    const plan = service.createPlan({
      provider: 'magnit',
      allowOrderSubmission: true,
    });

    expect(plan.allowed.canSubmitOrder).toBe(true);
    expect(plan.steps.map((step) => step.code)).toContain('CONFIRM_EXTERNAL_ORDER');
    expect(plan.steps.map((step) => step.code)).toContain('SUBMIT_ORDER');
    expect(
      plan.steps.find((step) => step.code === 'CONFIRM_EXTERNAL_ORDER')?.requiresFreshUserAction,
    ).toBe(true);
  });

  it('rejects automatic payment capture requests', () => {
    const service = new BrowserStoreAutomationPolicyService();

    expect(() =>
      service.createPlan({
        provider: 'yandex-go',
        allowPayment: true,
      }),
    ).toThrow(BadRequestException);
  });
});
