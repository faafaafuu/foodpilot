import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { StoreCartResponse } from '../store-adapters/store-adapter.types';
import { CartBuilderService } from './cart-builder.service';
import { BuildCartDto } from './dto/build-cart.dto';

@ApiTags('cart-builder')
@Controller('cart-builder')
export class CartBuilderController {
  constructor(private readonly cartBuilderService: CartBuilderService) {}

  @Post('grocery-lists/:groceryListId/cart')
  @ApiCreatedResponse({ description: 'Prepared cart from a grocery list.' })
  buildCartFromGroceryList(
    @Param('groceryListId') groceryListId: string,
    @Body() dto: BuildCartDto,
  ): Promise<StoreCartResponse> {
    return this.cartBuilderService.buildCartFromGroceryList(groceryListId, dto);
  }

  @Get('carts/:cartId')
  @ApiOkResponse({ description: 'Prepared cart details.' })
  getCart(@Param('cartId') cartId: string): Promise<StoreCartResponse> {
    return this.cartBuilderService.getCart(cartId);
  }
}
