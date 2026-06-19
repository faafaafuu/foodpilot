import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DishesService } from './dishes.service';
import {
  DishDetailsResponse,
  DishSummaryResponse,
  RecipeIngredientResponse,
  RecipeResponse,
} from './dishes.types';

@ApiTags('dishes')
@Controller('dishes')
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @Get()
  @ApiOkResponse({ description: 'Available MVP dishes with calories and macro summary.' })
  listDishes(): Promise<DishSummaryResponse[]> {
    return this.dishesService.listDishes();
  }

  @Get(':slug')
  @ApiOkResponse({ description: 'Dish details with recipe when available.' })
  getDish(@Param('slug') slug: string): Promise<DishDetailsResponse> {
    return this.dishesService.getDish(slug);
  }

  @Get(':slug/recipe')
  @ApiOkResponse({ description: 'Short recipe with ordered ingredients.' })
  getRecipe(@Param('slug') slug: string): Promise<RecipeResponse> {
    return this.dishesService.getRecipe(slug);
  }

  @Get(':slug/ingredients')
  @ApiOkResponse({ description: 'Ordered recipe ingredients for a dish.' })
  getIngredients(@Param('slug') slug: string): Promise<RecipeIngredientResponse[]> {
    return this.dishesService.getIngredients(slug);
  }
}
