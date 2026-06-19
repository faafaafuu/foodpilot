import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GroceryListsController } from './grocery-lists.controller';
import { GroceryListsService } from './grocery-lists.service';

@Module({
  imports: [PrismaModule],
  controllers: [GroceryListsController],
  providers: [GroceryListsService],
  exports: [GroceryListsService],
})
export class GroceryListsModule {}
