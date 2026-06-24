import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CheckoutReviewResponse, PaymentIntentResponse } from './checkout.types';
import { CheckoutService } from './checkout.service';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get('carts/:cartId/review')
  @ApiOkResponse({ description: 'Checkout safety review before payment.' })
  reviewCart(@Param('cartId') cartId: string): Promise<CheckoutReviewResponse> {
    return this.checkoutService.reviewCart(cartId);
  }

  @Post('carts/:cartId/payment-intents')
  @ApiCreatedResponse({ description: 'Create a mock payment intent for a confirmed cart.' })
  createPaymentIntent(@Param('cartId') cartId: string): Promise<PaymentIntentResponse> {
    return this.checkoutService.createPaymentIntent(cartId);
  }

  @Post('payment-intents/:paymentIntentId/confirm')
  @ApiOkResponse({ description: 'Confirm and capture a mock payment intent.' })
  confirmPaymentIntent(
    @Param('paymentIntentId') paymentIntentId: string,
  ): Promise<PaymentIntentResponse> {
    return this.checkoutService.confirmPaymentIntent(paymentIntentId);
  }
}
