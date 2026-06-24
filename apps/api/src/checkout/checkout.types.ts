import { PaymentIntentStatus, PaymentProvider } from '@prisma/client';
import { StoreCartResponse } from '../store-adapters/store-adapter.types';

export interface CheckoutReviewResponse {
  cart: StoreCartResponse;
  canCreatePaymentIntent: boolean;
  confirmationRequired: boolean;
  externalOrderSubmission: 'NOT_IMPLEMENTED';
  warnings: string[];
}

export interface PaymentIntentResponse {
  id: string;
  cartId: string;
  provider: PaymentProvider;
  providerPaymentId: string;
  status: PaymentIntentStatus;
  amountCents: number;
  currency: string;
  confirmationUrl: string | null;
  safetyNotes: string[];
  confirmedAt: Date | null;
}
