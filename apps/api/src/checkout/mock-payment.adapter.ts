import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CreatePaymentIntentInput,
  PaymentAdapter,
  ProviderPaymentIntent,
} from './payment-adapter.types';

@Injectable()
export class MockPaymentAdapter implements PaymentAdapter {
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<ProviderPaymentIntent> {
    const providerPaymentId = `mock_pay_${randomUUID()}`;

    return {
      providerPaymentId,
      confirmationUrl: `foodpilot://mock-payment/${input.cartId}/${providerPaymentId}`,
    };
  }

  async capturePayment(providerPaymentId: string): Promise<void> {
    void providerPaymentId;

    return Promise.resolve();
  }
}
