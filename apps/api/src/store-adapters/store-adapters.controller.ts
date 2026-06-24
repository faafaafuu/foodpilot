import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { BrowserStoreAutomationPolicyService } from './browser-store-automation-policy.service';
import { BrowserStoreSessionService } from './browser-store-session.service';
import { CreateBrowserAutomationPlanDto } from './dto/create-browser-automation-plan.dto';
import { StartBrowserStoreSessionDto } from './dto/start-browser-store-session.dto';
import { PageStoreAdapter } from './page-store.adapter';
import { ReplaceProductDto } from './dto/replace-product.dto';
import { MockStoreAdapter } from './mock-store.adapter';
import {
  BrowserStoreAutomationPlanResponse,
  BrowserStoreAutomationStatusResponse,
  BrowserStoreSessionResponse,
  ParsedStoreSearchResponse,
  StoreAvailabilityResponse,
  StoreCartResponse,
  StoreProductResponse,
} from './store-adapter.types';

@ApiTags('store-adapters')
@Controller('store-adapters/mock')
export class StoreAdaptersController {
  constructor(private readonly mockStoreAdapter: MockStoreAdapter) {}

  @Get('search')
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiOkResponse({ description: 'Search mock store products.' })
  searchProduct(@Query('query') query = ''): Promise<StoreProductResponse[]> {
    return this.mockStoreAdapter.searchProduct(query);
  }

  @Get('products/:productId')
  @ApiOkResponse({ description: 'Mock store product details.' })
  getProductDetails(@Param('productId') productId: string): Promise<StoreProductResponse> {
    return this.mockStoreAdapter.getProductDetails(productId);
  }

  @Get('products/:productId/availability')
  @ApiOkResponse({ description: 'Mock store product availability.' })
  checkAvailability(@Param('productId') productId: string): Promise<StoreAvailabilityResponse> {
    return this.mockStoreAdapter.checkAvailability(productId);
  }

  @Post('cart/items')
  @ApiCreatedResponse({ description: 'Add a mock store product to a draft cart.' })
  addToCart(@Body() dto: AddToCartDto): Promise<StoreCartResponse> {
    return this.mockStoreAdapter.addToCart(dto);
  }

  @Get('cart/:cartId')
  @ApiOkResponse({ description: 'Mock store cart.' })
  getCart(@Param('cartId') cartId: string): Promise<StoreCartResponse> {
    return this.mockStoreAdapter.getCart(cartId);
  }

  @Post('cart/:cartId/replace')
  @ApiOkResponse({ description: 'Replace a product in the mock store cart.' })
  replaceProduct(
    @Param('cartId') cartId: string,
    @Body() dto: ReplaceProductDto,
  ): Promise<StoreCartResponse> {
    return this.mockStoreAdapter.replaceProduct(cartId, dto.oldProductId, dto.newProductId);
  }
}

@ApiTags('store-adapters')
@Controller('store-adapters/page')
export class PageStoreAdaptersController {
  constructor(private readonly pageStoreAdapter: PageStoreAdapter) {}

  @Get('vkusvill/search')
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiOkResponse({ description: 'Parse public VkusVill search page products.' })
  searchVkusvill(@Query('query') query = ''): Promise<ParsedStoreSearchResponse> {
    return this.pageStoreAdapter.searchVkusvill(query);
  }
}

@ApiTags('store-adapters')
@Controller('store-adapters/browser-session')
export class BrowserSessionStoreAdaptersController {
  constructor(
    private readonly policyService: BrowserStoreAutomationPolicyService,
    private readonly sessionService: BrowserStoreSessionService,
  ) {}

  @Get('status')
  @ApiOkResponse({ description: 'Browser-session store automation capabilities and limits.' })
  getStatus(): BrowserStoreAutomationStatusResponse {
    return this.policyService.getStatus();
  }

  @Post('automation-plan')
  @ApiCreatedResponse({
    description: 'Create a safe automation plan for a user-owned browser session.',
  })
  createAutomationPlan(
    @Body() dto: CreateBrowserAutomationPlanDto,
  ): BrowserStoreAutomationPlanResponse {
    return this.policyService.createPlan(dto);
  }

  @Get('sessions')
  @ApiOkResponse({ description: 'Active browser store sessions for this API process.' })
  listSessions(): BrowserStoreSessionResponse[] {
    return this.sessionService.listSessions();
  }

  @Post('sessions')
  @ApiCreatedResponse({ description: 'Open a provider login page in a local browser profile.' })
  startSession(@Body() dto: StartBrowserStoreSessionDto): Promise<BrowserStoreSessionResponse> {
    return this.sessionService.startSession(dto);
  }

  @Get('sessions/:sessionId')
  @ApiOkResponse({ description: 'Browser store session status.' })
  getSession(@Param('sessionId') sessionId: string): BrowserStoreSessionResponse {
    return this.sessionService.getSession(sessionId);
  }

  @Post('sessions/:sessionId/close')
  @ApiOkResponse({ description: 'Close a browser store session.' })
  closeSession(@Param('sessionId') sessionId: string): Promise<BrowserStoreSessionResponse> {
    return this.sessionService.closeSession(sessionId);
  }
}
