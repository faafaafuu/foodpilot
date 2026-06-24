import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { PageStoreAdapter } from './page-store.adapter';
import { ReplaceProductDto } from './dto/replace-product.dto';
import { MockStoreAdapter } from './mock-store.adapter';
import {
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
