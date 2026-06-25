import { BadRequestException } from '@nestjs/common';
import { SberPayPaymentAdapter } from '../src/checkout/sberpay-payment.adapter';

describe('SberPayPaymentAdapter', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('reports missing production credentials', () => {
    process.env.SBERPAY_ENV = 'production';
    const adapter = new SberPayPaymentAdapter();

    expect(adapter.getStatus()).toEqual(
      expect.objectContaining({
        provider: 'sberpay',
        configured: false,
        productionReady: false,
        missingEnv: expect.arrayContaining([
          'SBERPAY_USER_NAME',
          'SBERPAY_PASSWORD',
          'SBERPAY_RETURN_URL',
          'SBERPAY_FAIL_URL',
        ]),
      }),
    );
  });

  it('blocks checkout creation outside production mode', async () => {
    process.env.SBERPAY_ENV = 'development';
    process.env.SBERPAY_USER_NAME = 'merchant';
    process.env.SBERPAY_PASSWORD = 'secret';
    process.env.SBERPAY_RETURN_URL = 'https://foodpilot.example/success';
    process.env.SBERPAY_FAIL_URL = 'https://foodpilot.example/fail';
    const adapter = new SberPayPaymentAdapter();

    await expect(
      adapter.createPaymentIntent({
        cartId: 'cart-1',
        amountCents: 120000,
        currency: 'RUB',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('registers a production SberPay order through register.do', async () => {
    setProductionEnv();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          errorCode: '0',
          orderId: 'sber-order-1',
          formUrl: 'https://ecommerce.sberbank.ru/pp/pay_ru?orderId=sber-order-1',
          externalParams: {
            sbolBankInvoiceId: 'invoice-1',
          },
        }),
      ),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const adapter = new SberPayPaymentAdapter();

    const paymentIntent = await adapter.createPaymentIntent(
      {
        cartId: 'cart-1',
        amountCents: 120000,
        currency: 'RUB',
      },
      {
        phone: '+79991234567',
        email: 'customer@example.com',
      },
    );

    expect(paymentIntent).toEqual({
      providerPaymentId: 'sber-order-1',
      confirmationUrl: 'https://ecommerce.sberbank.ru/pp/pay_ru?orderId=sber-order-1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ecommerce.sberbank.ru/ecomm/gw/partner/api/v1/register.do',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        userName: 'merchant',
        password: 'secret',
        amount: 120000,
        currency: '643',
        phone: '79991234567',
        email: 'customer@example.com',
        jsonParams: {
          app2app: 'false',
          web2app: 'true',
        },
      }),
    );
  });

  it('maps paid SberPay order status to captured payment intent status', async () => {
    setProductionEnv();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          errorCode: '0',
          orderStatus: 2,
          actionCode: 0,
          actionCodeDescription: 'Запрос успешно обработан',
        }),
      ),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const adapter = new SberPayPaymentAdapter();

    const status = await adapter.getPaymentStatus('sber-order-1');

    expect(status).toEqual({
      provider: 'sberpay',
      providerPaymentId: 'sber-order-1',
      orderStatus: 2,
      paymentIntentStatus: 'CAPTURED',
      paid: true,
      actionCode: 0,
      actionCodeDescription: 'Запрос успешно обработан',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ecommerce.sberbank.ru/ecomm/gw/partner/api/v1/getOrderStatusExtended.do',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      userName: 'merchant',
      password: 'secret',
      orderId: 'sber-order-1',
      language: 'ru',
    });
  });

  it('maps declined SberPay order status to failed payment intent status', async () => {
    setProductionEnv();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          errorCode: '0',
          orderStatus: 6,
          actionCode: 2005,
          actionCodeDescription: 'Оплата отклонена',
        }),
      ),
    }) as unknown as typeof fetch;
    const adapter = new SberPayPaymentAdapter();

    const status = await adapter.getPaymentStatus('sber-order-1');

    expect(status.paymentIntentStatus).toBe('FAILED');
    expect(status.paid).toBe(false);
    expect(status.actionCodeDescription).toBe('Оплата отклонена');
  });
});

function setProductionEnv(): void {
  process.env.SBERPAY_ENV = 'production';
  process.env.SBERPAY_API_BASE_URL = 'https://ecommerce.sberbank.ru/ecomm/gw/partner/api/v1';
  process.env.SBERPAY_USER_NAME = 'merchant';
  process.env.SBERPAY_PASSWORD = 'secret';
  process.env.SBERPAY_RETURN_URL = 'https://foodpilot.example/success';
  process.env.SBERPAY_FAIL_URL = 'https://foodpilot.example/fail';
}
