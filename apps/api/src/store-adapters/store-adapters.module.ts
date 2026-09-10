import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BrowserStoreAutomationPolicyService } from './browser-store-automation-policy.service';
import { BrowserStoreSessionService } from './browser-store-session.service';
import { PlaywrightBrowserStoreDriver } from './browser-store-driver';
import { MagnitAdapter } from './magnit.adapter';
import { MetroAdapter } from './metro.adapter';
import { MockStoreAdapter } from './mock-store.adapter';
import { PageStoreAdapter } from './page-store.adapter';
import { PyaterochkaAdapter } from './pyaterochka.adapter';
import { StoreSearchService } from './store-search.service';
import { VkusvillCartService } from './vkusvill-cart.service';
import { VkusvillCheckoutService } from './vkusvill-checkout.service';
import { VkusvillMcpClient } from './vkusvill-mcp.client';
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
    MagnitAdapter,
    MetroAdapter,
    PyaterochkaAdapter,
    StoreSearchService,
    VkusvillMcpClient,
    VkusvillCartService,
    VkusvillCheckoutService,
    BrowserStoreAutomationPolicyService,
    BrowserStoreSessionService,
    PlaywrightBrowserStoreDriver,
  ],
})
export class StoreAdaptersModule {}
