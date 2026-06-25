import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { CreateSberPayPaymentDto } from './dto/create-sberpay-payment.dto';
import { CreatePaymentIntentInput, ProviderPaymentIntent } from './payment-adapter.types';
import { SberPayPaymentStatusResponse, SberPayStatusResponse } from './checkout.types';

interface SberPayRegisterResponse {
  errorCode?: string;
  errorMessage?: string;
  orderId?: string;
  formUrl?: string;
  externalParams?: {
    sbolDeepLink?: string;
    sbolBankInvoiceId?: string;
  };
}

interface SberPayOrderStatusExtendedResponse {
  errorCode?: string;
  errorMessage?: string;
  orderStatus?: number;
  actionCode?: number;
  actionCodeDescription?: string;
  amount?: number;
  currency?: string;
  orderNumber?: string;
}

const REQUIRED_ENV = [
  'SBERPAY_ENV=production',
  'SBERPAY_USER_NAME',
  'SBERPAY_PASSWORD',
  'SBERPAY_RETURN_URL',
  'SBERPAY_FAIL_URL',
];

@Injectable()
export class SberPayPaymentAdapter {
  getStatus(): SberPayStatusResponse {
    const missingEnv = this.missingEnv();

    return {
      provider: 'sberpay',
      configured: missingEnv.length === 0,
      productionReady: missingEnv.length === 0,
      mode: this.mode(),
      baseUrl: this.baseUrl(),
      endpoint: this.registerUrl().toString(),
      capabilities: [
        'register_order',
        'redirect_checkout',
        'sberpay_payment_page',
        'provider_side_confirmation',
        'order_status_extended',
      ],
      requiredEnv: REQUIRED_ENV,
      missingEnv,
      checkoutBehavior: 'REDIRECT_TO_SBER',
    };
  }

  async createPaymentIntent(
    input: CreatePaymentIntentInput,
    dto: CreateSberPayPaymentDto = {},
  ): Promise<ProviderPaymentIntent> {
    this.assertProductionReady();

    const payload = {
      userName: this.requiredEnv('SBERPAY_USER_NAME'),
      password: this.requiredEnv('SBERPAY_PASSWORD'),
      orderNumber: this.orderNumber(input.cartId),
      amount: input.amountCents,
      currency: currencyToNumericCode(input.currency),
      returnUrl: dto.returnUrl ?? this.requiredEnv('SBERPAY_RETURN_URL'),
      failUrl: dto.failUrl ?? this.requiredEnv('SBERPAY_FAIL_URL'),
      description: dto.description ?? input.description ?? `FoodPilot cart ${input.cartId}`,
      language: 'ru',
      pageView: 'DESKTOP',
      clientId: dto.clientId,
      phone: normalizePhone(dto.phone),
      email: dto.email,
      merchantLogin: process.env.SBERPAY_MERCHANT_LOGIN,
      features: 'FORCE_SSL',
      jsonParams: {
        app2app: 'false',
        web2app: 'true',
      },
    };

    const response = await fetch(this.registerUrl().toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dropEmpty(payload)),
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new BadGatewayException(
        `SberPay register.do failed: ${response.status} ${responseText.slice(0, 500)}`,
      );
    }

    const data = parseSberPayResponse<SberPayRegisterResponse>(responseText);

    if (data.errorCode && data.errorCode !== '0') {
      throw new BadGatewayException(
        `SberPay rejected order registration: ${data.errorCode} ${data.errorMessage ?? ''}`.trim(),
      );
    }

    if (!data.orderId || !data.formUrl) {
      throw new BadGatewayException('SberPay did not return orderId and formUrl.');
    }

    return {
      providerPaymentId: data.orderId,
      confirmationUrl: data.formUrl,
    };
  }

  async getPaymentStatus(providerPaymentId: string): Promise<SberPayPaymentStatusResponse> {
    this.assertProductionReady();

    const payload = {
      userName: this.requiredEnv('SBERPAY_USER_NAME'),
      password: this.requiredEnv('SBERPAY_PASSWORD'),
      orderId: providerPaymentId,
      language: 'ru',
    };
    const response = await fetch(this.orderStatusUrl().toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new BadGatewayException(
        `SberPay getOrderStatusExtended.do failed: ${response.status} ${responseText.slice(
          0,
          500,
        )}`,
      );
    }

    const data = parseSberPayResponse<SberPayOrderStatusExtendedResponse>(responseText);

    if (data.errorCode && data.errorCode !== '0') {
      throw new BadGatewayException(
        `SberPay rejected status request: ${data.errorCode} ${data.errorMessage ?? ''}`.trim(),
      );
    }

    const paymentIntentStatus = mapSberPayOrderStatus(data.orderStatus);

    return {
      provider: 'sberpay',
      providerPaymentId,
      orderStatus: data.orderStatus ?? null,
      paymentIntentStatus,
      paid: paymentIntentStatus === 'CAPTURED',
      actionCode: data.actionCode ?? null,
      actionCodeDescription: data.actionCodeDescription ?? null,
    };
  }

  private assertProductionReady(): void {
    const status = this.getStatus();

    if (!status.productionReady) {
      throw new BadRequestException(
        `SberPay production checkout is not configured. Missing: ${status.missingEnv.join(', ')}.`,
      );
    }
  }

  private missingEnv(): string[] {
    const requiredValues: Array<[string, string | undefined]> = [
      ['SBERPAY_USER_NAME', process.env.SBERPAY_USER_NAME],
      ['SBERPAY_PASSWORD', process.env.SBERPAY_PASSWORD],
      ['SBERPAY_RETURN_URL', process.env.SBERPAY_RETURN_URL],
      ['SBERPAY_FAIL_URL', process.env.SBERPAY_FAIL_URL],
    ];
    const missing = requiredValues.filter(([, value]) => !value).map(([name]) => name);

    if (this.mode() !== 'production') {
      missing.unshift('SBERPAY_ENV=production');
    }

    if (looksLikeTestGateway(this.baseUrl())) {
      missing.unshift('SBERPAY_API_BASE_URL must point to the production Sber gateway');
    }

    return missing;
  }

  private requiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new BadRequestException(`${name} is required for SberPay checkout.`);
    }

    return value;
  }

  private registerUrl(): URL {
    return new URL('register.do', `${this.baseUrl().replace(/\/+$/, '')}/`);
  }

  private orderStatusUrl(): URL {
    return new URL('getOrderStatusExtended.do', `${this.baseUrl().replace(/\/+$/, '')}/`);
  }

  private baseUrl(): string {
    return (
      process.env.SBERPAY_API_BASE_URL ?? 'https://ecommerce.sberbank.ru/ecomm/gw/partner/api/v1'
    );
  }

  private mode(): 'development' | 'production' {
    return process.env.SBERPAY_ENV === 'production' ? 'production' : 'development';
  }

  private orderNumber(cartId: string): string {
    return `foodpilot-${cartId}-${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
  }
}

function currencyToNumericCode(currency: string): string {
  if (currency === 'RUB') {
    return '643';
  }

  throw new BadRequestException(`SberPay supports RUB carts only. Received: ${currency}`);
}

function normalizePhone(phone: string | undefined): string | undefined {
  return phone?.replace(/^\+/, '');
}

function parseSberPayResponse<T>(responseText: string): T {
  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new BadGatewayException(
      `SberPay returned non-JSON response: ${responseText.slice(0, 500)}`,
    );
  }
}

function dropEmpty<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

function looksLikeTestGateway(baseUrl: string): boolean {
  return /ecomtest|ecomift|rbsuat|sandbox|test/i.test(baseUrl);
}

function mapSberPayOrderStatus(
  orderStatus: number | undefined,
): SberPayPaymentStatusResponse['paymentIntentStatus'] {
  if (orderStatus === 2) {
    return 'CAPTURED';
  }

  if (orderStatus === 3 || orderStatus === 4) {
    return 'CANCELED';
  }

  if (orderStatus === 6) {
    return 'FAILED';
  }

  return 'REQUIRES_CONFIRMATION';
}
