import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cart, CartItem, PaymentIntent } from '@prisma/client';
import { CartBuilderService } from '../cart-builder/cart-builder.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CheckoutReviewResponse,
  PaymentIntentResponse,
  SberPayStatusResponse,
} from './checkout.types';
import { CreateSberPayPaymentDto } from './dto/create-sberpay-payment.dto';
import { MockPaymentAdapter } from './mock-payment.adapter';
import { SberPayPaymentAdapter } from './sberpay-payment.adapter';

type CartWithItems = Cart & {
  items: CartItem[];
};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartBuilderService: CartBuilderService,
    private readonly paymentAdapter: MockPaymentAdapter,
    private readonly sberPayAdapter: SberPayPaymentAdapter,
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
    const cart = await this.getPayableCart(cartId);

    const existingIntent = await this.prisma.paymentIntent.findFirst({
      where: {
        cartId: cart.id,
        provider: 'MOCK',
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

  getSberPayStatus(): SberPayStatusResponse {
    return this.sberPayAdapter.getStatus();
  }

  async createSberPayPaymentIntent(
    cartId: string,
    dto: CreateSberPayPaymentDto = {},
  ): Promise<PaymentIntentResponse> {
    const cart = await this.getPayableCart(cartId);

    const existingIntent = await this.prisma.paymentIntent.findFirst({
      where: {
        cartId: cart.id,
        provider: 'SBERPAY',
        status: 'REQUIRES_CONFIRMATION',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingIntent) {
      return toPaymentIntentResponse(existingIntent);
    }

    const providerIntent = await this.sberPayAdapter.createPaymentIntent(
      {
        cartId: cart.id,
        amountCents: cart.subtotalCents,
        currency: cart.currency,
        description: `FoodPilot grocery cart ${cart.id}`,
      },
      dto,
    );
    const paymentIntent = await this.prisma.paymentIntent.create({
      data: {
        cartId: cart.id,
        provider: 'SBERPAY',
        providerPaymentId: providerIntent.providerPaymentId,
        amountCents: cart.subtotalCents,
        currency: cart.currency,
        confirmationUrl: providerIntent.confirmationUrl,
        safetyNotes: [
          'SberPay payment is completed on the Sber payment page.',
          'FoodPilot does not store card data.',
          'FoodPilot does not capture SberPay payments locally.',
          'External store order submission still requires user confirmation.',
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

    if (paymentIntent.provider !== 'MOCK') {
      throw new BadRequestException(
        `${paymentIntent.provider} payments must be confirmed by provider status callbacks, not local capture.`,
      );
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

  private async getPayableCart(cartId: string): Promise<CartWithItems> {
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
