export interface CreatePaymentIntentInput {
  cartId: string;
  amountCents: number;
  currency: string;
}

export interface ProviderPaymentIntent {
  providerPaymentId: string;
  confirmationUrl: string | null;
}

export interface PaymentAdapter {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<ProviderPaymentIntent>;
  capturePayment(providerPaymentId: string): Promise<void>;
}
