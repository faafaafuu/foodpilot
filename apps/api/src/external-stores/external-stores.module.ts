import { Module } from '@nestjs/common';
import { GroceryListsModule } from '../grocery-lists/grocery-lists.module';
import { ExternalStoresController } from './external-stores.controller';
import { InstacartDeveloperAdapter } from './instacart-developer.adapter';

@Module({
  imports: [GroceryListsModule],
  controllers: [ExternalStoresController],
  providers: [InstacartDeveloperAdapter],
})
export class ExternalStoresModule {}
