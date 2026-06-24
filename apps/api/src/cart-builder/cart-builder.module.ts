import { Module } from '@nestjs/common';
import { GroceryListsModule } from '../grocery-lists/grocery-lists.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CartBuilderController } from './cart-builder.controller';
import { CartBuilderService } from './cart-builder.service';

@Module({
  imports: [PrismaModule, GroceryListsModule],
  controllers: [CartBuilderController],
  providers: [CartBuilderService],
})
export class CartBuilderModule {}
