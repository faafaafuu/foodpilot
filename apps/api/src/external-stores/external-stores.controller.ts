import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateInstacartLinkDto } from './dto/create-instacart-link.dto';
import {
  ExternalStoreStatusResponse,
  InstacartRetailersResponse,
  InstacartShoppingListLinkResponse,
} from './external-stores.types';
import { InstacartDeveloperAdapter } from './instacart-developer.adapter';

@ApiTags('external-stores')
@Controller('external-stores/instacart')
export class ExternalStoresController {
  constructor(private readonly instacartAdapter: InstacartDeveloperAdapter) {}

  @Get('status')
  @ApiOkResponse({ description: 'Instacart Developer Platform integration status.' })
  getInstacartStatus(): ExternalStoreStatusResponse {
    return this.instacartAdapter.getStatus();
  }

  @Get('retailers')
  @ApiOkResponse({ description: 'Nearby Instacart retailers for a postal code.' })
  getNearbyRetailers(
    @Query('postalCode') postalCode: string,
    @Query('countryCode') countryCode = 'US',
  ): Promise<InstacartRetailersResponse> {
    return this.instacartAdapter.getNearbyRetailers(postalCode, countryCode);
  }

  @Post('grocery-lists/:groceryListId/link')
  @ApiCreatedResponse({ description: 'Create an Instacart shopping list checkout link.' })
  createShoppingListLink(
    @Param('groceryListId') groceryListId: string,
    @Body() dto: CreateInstacartLinkDto,
  ): Promise<InstacartShoppingListLinkResponse> {
    return this.instacartAdapter.createShoppingListLink(groceryListId, dto);
  }
}
