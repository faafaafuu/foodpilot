import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { DishRecommendationsResponse, WeeklyMenuResponse } from './recommendations.types';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get(':userId/dishes')
  @ApiQuery({ name: 'remainingCalories', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiOkResponse({ description: 'Ranked dish recommendations for the user.' })
  recommendDishes(
    @Param('userId') userId: string,
    @Query('remainingCalories') remainingCalories?: string,
    @Query('limit') limit?: string,
    @Query('date') date?: string,
  ): Promise<DishRecommendationsResponse> {
    return this.recommendationsService.recommendDishes(userId, {
      remainingCalories:
        remainingCalories !== undefined ? Number.parseInt(remainingCalories, 10) : undefined,
      limit: limit !== undefined ? Number.parseInt(limit, 10) : undefined,
      date,
    });
  }

  @Get(':userId/week')
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiOkResponse({ description: 'Simple weekly menu plan based on taste memory.' })
  recommendWeeklyMenu(
    @Param('userId') userId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
    @Query('date') date?: string,
  ): Promise<WeeklyMenuResponse> {
    return this.recommendationsService.recommendWeeklyMenu(userId, { days, date });
  }
}
