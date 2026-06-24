import { Module } from '@nestjs/common';
import { CartBuilderModule } from '../cart-builder/cart-builder.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { MockPaymentAdapter } from './mock-payment.adapter';

@Module({
  imports: [PrismaModule, CartBuilderModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, MockPaymentAdapter],
})
export class CheckoutModule {}
