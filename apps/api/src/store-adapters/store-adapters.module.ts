import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MockStoreAdapter } from './mock-store.adapter';
import { StoreAdaptersController } from './store-adapters.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StoreAdaptersController],
  providers: [MockStoreAdapter],
})
export class StoreAdaptersModule {}
