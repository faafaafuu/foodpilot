import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cart, CartItem, PaymentIntent } from '@prisma/client';
import { CartBuilderService } from '../cart-builder/cart-builder.service';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutReviewResponse, PaymentIntentResponse } from './checkout.types';
import { MockPaymentAdapter } from './mock-payment.adapter';

type CartWithItems = Cart & {
  items: CartItem[];
};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartBuilderService: CartBuilderService,
    private readonly paymentAdapter: MockPaymentAdapter,
  ) {}

  async reviewCart(cartId: string): Promise<CheckoutReviewResponse> {
    const [cart, cartResponse] = await Promise.all([
      this.getCartWithItems(cartId),
      this.cartBuilderService.getCart(cartId),
    ]);
    const warnings = checkoutWarnings(cart);

    return {
      cart: cartResponse,
      canCreatePaymentIntent: cart.status === 'CONFIRMED' && cart.items.length > 0,
      confirmationRequired: cart.status !== 'CONFIRMED',
      externalOrderSubmission: 'NOT_IMPLEMENTED',
      warnings,
    };
  }

  async createPaymentIntent(cartId: string): Promise<PaymentIntentResponse> {
    const cart = await this.getCartWithItems(cartId);

    if (cart.status !== 'CONFIRMED') {
      throw new BadRequestException('Cart must be explicitly confirmed before payment.');
    }

    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot create payment intent for an empty cart.');
    }

    if (cart.subtotalCents <= 0) {
      throw new BadRequestException('Cannot create payment intent without a positive amount.');
    }

    const existingIntent = await this.prisma.paymentIntent.findFirst({
      where: {
        cartId: cart.id,
        status: 'REQUIRES_CONFIRMATION',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingIntent) {
      return toPaymentIntentResponse(existingIntent);
    }

    const providerIntent = await this.paymentAdapter.createPaymentIntent({
      cartId: cart.id,
      amountCents: cart.subtotalCents,
      currency: cart.currency,
    });
    const paymentIntent = await this.prisma.paymentIntent.create({
      data: {
        cartId: cart.id,
        provider: 'MOCK',
        providerPaymentId: providerIntent.providerPaymentId,
        amountCents: cart.subtotalCents,
        currency: cart.currency,
        confirmationUrl: providerIntent.confirmationUrl,
        safetyNotes: [
          'Mock payment only; no real money is charged.',
          'FoodPilot does not store card data.',
          'External store order submission is not implemented.',
        ],
      },
    });

    return toPaymentIntentResponse(paymentIntent);
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
    });

    if (!paymentIntent) {
      throw new NotFoundException(`Payment intent ${paymentIntentId} was not found`);
    }

    if (paymentIntent.status === 'CAPTURED') {
      return toPaymentIntentResponse(paymentIntent);
    }

    if (paymentIntent.status !== 'REQUIRES_CONFIRMATION') {
      throw new BadRequestException('Only payment intents requiring confirmation can be captured.');
    }

    await this.paymentAdapter.capturePayment(paymentIntent.providerPaymentId);
    const capturedIntent = await this.prisma.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: {
        status: 'CAPTURED',
        confirmedAt: new Date(),
      },
    });

    return toPaymentIntentResponse(capturedIntent);
  }

  private async getCartWithItems(cartId: string): Promise<CartWithItems> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} was not found`);
    }

    return cart;
  }
}

function checkoutWarnings(cart: CartWithItems): string[] {
  const warnings = ['External store order submission is not implemented.'];

  if (cart.status !== 'CONFIRMED') {
    warnings.push('Cart must be explicitly confirmed before payment.');
  }

  if (cart.items.length === 0) {
    warnings.push('Cart is empty.');
  }

  return warnings;
}

function toPaymentIntentResponse(paymentIntent: PaymentIntent): PaymentIntentResponse {
  return {
    id: paymentIntent.id,
    cartId: paymentIntent.cartId,
    provider: paymentIntent.provider,
    providerPaymentId: paymentIntent.providerPaymentId,
    status: paymentIntent.status,
    amountCents: paymentIntent.amountCents,
    currency: paymentIntent.currency,
    confirmationUrl: paymentIntent.confirmationUrl,
    safetyNotes: paymentIntent.safetyNotes,
    confirmedAt: paymentIntent.confirmedAt,
  };
}
