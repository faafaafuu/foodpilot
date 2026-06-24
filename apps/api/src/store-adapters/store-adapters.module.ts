import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BrowserStoreAutomationPolicyService } from './browser-store-automation-policy.service';
import { BrowserStoreSessionService } from './browser-store-session.service';
import { PlaywrightBrowserStoreDriver } from './browser-store-driver';
import { MockStoreAdapter } from './mock-store.adapter';
import { PageStoreAdapter } from './page-store.adapter';
import {
  BrowserSessionStoreAdaptersController,
  PageStoreAdaptersController,
  StoreAdaptersController,
} from './store-adapters.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    StoreAdaptersController,
    PageStoreAdaptersController,
    BrowserSessionStoreAdaptersController,
  ],
  providers: [
    MockStoreAdapter,
    PageStoreAdapter,
    BrowserStoreAutomationPolicyService,
    BrowserStoreSessionService,
    PlaywrightBrowserStoreDriver,
  ],
})
export class StoreAdaptersModule {}
