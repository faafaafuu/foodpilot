import { CheckoutService } from '../src/checkout/checkout.service';
import { MockPaymentAdapter } from '../src/checkout/mock-payment.adapter';
import { CartBuilderService } from '../src/cart-builder/cart-builder.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SberPayPaymentAdapter } from '../src/checkout/sberpay-payment.adapter';

describe('CheckoutService', () => {
  it('requires explicit cart confirmation before creating a payment intent', async () => {
    const prisma = createPrismaMock({ cartStatus: 'READY_FOR_CONFIRMATION' });
    const service = createService(prisma);

    await expect(service.createPaymentIntent('cart-1')).rejects.toThrow(
      'Cart must be explicitly confirmed before payment.',
    );
  });

  it('creates and captures a mock payment intent for a confirmed cart', async () => {
    const prisma = createPrismaMock({ cartStatus: 'CONFIRMED' });
    const service = createService(prisma);

    const paymentIntent = await service.createPaymentIntent('cart-1');
    const repeatedIntent = await service.createPaymentIntent('cart-1');
    const capturedIntent = await service.confirmPaymentIntent(paymentIntent.id);

    expect(paymentIntent.status).toBe('REQUIRES_CONFIRMATION');
    expect(paymentIntent.amountCents).toBe(102000);
    expect(paymentIntent.provider).toBe('MOCK');
    expect(paymentIntent.safetyNotes).toContain('Mock payment only; no real money is charged.');
    expect(repeatedIntent.id).toBe(paymentIntent.id);
    expect(capturedIntent.status).toBe('CAPTURED');
    expect(capturedIntent.confirmedAt).toBeInstanceOf(Date);
  });

  it('creates a SberPay redirect payment intent for a confirmed cart', async () => {
    const prisma = createPrismaMock({ cartStatus: 'CONFIRMED' });
    const sberPayAdapter = createSberPayPaymentAdapter();
    const service = createService(prisma, sberPayAdapter);

    const paymentIntent = await service.createSberPayPaymentIntent('cart-1', {
      returnUrl: 'https://foodpilot.example/success',
      failUrl: 'https://foodpilot.example/fail',
    });
    const repeatedIntent = await service.createSberPayPaymentIntent('cart-1');

    expect(paymentIntent.provider).toBe('SBERPAY');
    expect(paymentIntent.confirmationUrl).toBe('https://sber.test/pay');
    expect(paymentIntent.safetyNotes).toContain(
      'SberPay payment is completed on the Sber payment page.',
    );
    expect(repeatedIntent.id).toBe(paymentIntent.id);
    expect(sberPayAdapter.createPaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('does not locally capture external SberPay payments', async () => {
    const prisma = createPrismaMock({ cartStatus: 'CONFIRMED' });
    const service = createService(prisma, createSberPayPaymentAdapter());
    const paymentIntent = await service.createSberPayPaymentIntent('cart-1');

    await expect(service.confirmPaymentIntent(paymentIntent.id)).rejects.toThrow(
      'SBERPAY payments must be confirmed by provider status callbacks',
    );
  });

  it('returns checkout review warnings for carts that are not ready for payment', async () => {
    const prisma = createPrismaMock({ cartStatus: 'READY_FOR_CONFIRMATION' });
    const service = createService(prisma);

    const review = await service.reviewCart('cart-1');

    expect(review.canCreatePaymentIntent).toBe(false);
    expect(review.confirmationRequired).toBe(true);
    expect(review.externalOrderSubmission).toBe('NOT_IMPLEMENTED');
    expect(review.warnings).toContain('Cart must be explicitly confirmed before payment.');
  });
});

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  sberPayAdapter = createSberPayPaymentAdapter(),
): CheckoutService {
  return new CheckoutService(
    prisma as unknown as PrismaService,
    createCartBuilderServiceMock() as unknown as CartBuilderService,
    createMockPaymentAdapter() as unknown as MockPaymentAdapter,
    sberPayAdapter as unknown as SberPayPaymentAdapter,
  );
}

function createCartBuilderServiceMock() {
  return {
    getCart: jest.fn().mockResolvedValue({
      id: 'cart-1',
      userId: 'user-1',
      storeId: 'store-1',
      groceryListId: 'list-1',
      status: 'READY_FOR_CONFIRMATION',
      subtotalCents: 102000,
      currency: 'RUB',
      requiresConfirmation: true,
      items: [],
    }),
  };
}

function createMockPaymentAdapter() {
  return {
    createPaymentIntent: jest.fn().mockResolvedValue({
      providerPaymentId: 'mock-pay-1',
      confirmationUrl: 'foodpilot://mock-payment/cart-1/mock-pay-1',
    }),
    capturePayment: jest.fn().mockResolvedValue(undefined),
  };
}

function createSberPayPaymentAdapter() {
  return {
    getStatus: jest.fn().mockReturnValue({
      provider: 'sberpay',
      configured: true,
      productionReady: true,
      mode: 'production',
      baseUrl: 'https://ecommerce.sberbank.ru/ecomm/gw/partner/api/v1',
      endpoint: 'https://ecommerce.sberbank.ru/ecomm/gw/partner/api/v1/register.do',
      capabilities: ['register_order', 'redirect_checkout'],
      requiredEnv: [],
      missingEnv: [],
      checkoutBehavior: 'REDIRECT_TO_SBER',
    }),
    createPaymentIntent: jest.fn().mockResolvedValue({
      providerPaymentId: 'sber-order-1',
      confirmationUrl: 'https://sber.test/pay',
    }),
  };
}

function createPrismaMock(input: { cartStatus: 'READY_FOR_CONFIRMATION' | 'CONFIRMED' }) {
  const cart = {
    id: 'cart-1',
    userId: 'user-1',
    storeId: 'store-1',
    groceryListId: 'list-1',
    status: input.cartStatus,
    subtotalCents: 102000,
    currency: 'RUB',
    requiresConfirmation: input.cartStatus !== 'CONFIRMED',
    confirmedAt: input.cartStatus === 'CONFIRMED' ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'cart-item-1',
        cartId: 'cart-1',
        groceryListItemId: 'grocery-item-1',
        storeProductId: 'product-1',
        name: 'Фарш говяжий',
        quantity: 2,
        unitPriceCents: 45000,
        totalPriceCents: 90000,
        replacementForName: null,
        replacementReason: null,
        createdAt: new Date(),
      },
    ],
  };
  let paymentIntent: {
    id: string;
    cartId: string;
    provider: 'MOCK' | 'SBERPAY';
    providerPaymentId: string;
    status: 'REQUIRES_CONFIRMATION' | 'CAPTURED';
    amountCents: number;
    currency: string;
    confirmationUrl: string | null;
    safetyNotes: string[];
    createdAt: Date;
    updatedAt: Date;
    confirmedAt: Date | null;
  } | null = null;

  return {
    cart: {
      findUnique: jest.fn().mockResolvedValue(cart),
    },
    paymentIntent: {
      findFirst: jest.fn().mockImplementation(() => Promise.resolve(paymentIntent)),
      create: jest.fn().mockImplementation(({ data }) => {
        paymentIntent = {
          id: 'payment-intent-1',
          status: 'REQUIRES_CONFIRMATION',
          createdAt: new Date(),
          updatedAt: new Date(),
          confirmedAt: null,
          ...data,
        };

        return Promise.resolve(paymentIntent);
      }),
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(paymentIntent)),
      update: jest.fn().mockImplementation(({ data }) => {
        paymentIntent = {
          ...paymentIntent!,
          ...data,
          updatedAt: new Date(),
        };

        return Promise.resolve(paymentIntent);
      }),
    },
  };
}
