import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MockStoreAdapter } from './mock-store.adapter';
import { PageStoreAdapter } from './page-store.adapter';
import { PageStoreAdaptersController, StoreAdaptersController } from './store-adapters.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StoreAdaptersController, PageStoreAdaptersController],
  providers: [MockStoreAdapter, PageStoreAdapter],
})
export class StoreAdaptersModule {}
