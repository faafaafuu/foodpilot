import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { StoreCartResponse } from '../store-adapters/store-adapter.types';
import { MenuCartBuildResponse } from './cart-builder.types';
import { CartBuilderService } from './cart-builder.service';
import { BuildCartDto } from './dto/build-cart.dto';
import { BuildCartFromMenuRequestDto } from './dto/build-cart-from-menu.dto';

@ApiTags('cart-builder')
@Controller('cart-builder')
export class CartBuilderController {
  constructor(private readonly cartBuilderService: CartBuilderService) {}

  @Post('menu/cart')
  @ApiCreatedResponse({
    description: 'Generated grocery list and prepared cart from selected menu.',
  })
  buildCartFromMenu(@Body() dto: BuildCartFromMenuRequestDto): Promise<MenuCartBuildResponse> {
    return this.cartBuilderService.buildCartFromMenu(dto);
  }

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

  @Post('carts/:cartId/confirm')
  @ApiOkResponse({
    description: 'Confirm a prepared cart inside FoodPilot without placing an external order.',
  })
  confirmCart(@Param('cartId') cartId: string): Promise<StoreCartResponse> {
    return this.cartBuilderService.confirmCart(cartId);
  }
}
