import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CartBuilderController } from './cart-builder.controller';
import { CartBuilderService } from './cart-builder.service';

@Module({
  imports: [PrismaModule],
  controllers: [CartBuilderController],
  providers: [CartBuilderService],
})
export class CartBuilderModule {}
