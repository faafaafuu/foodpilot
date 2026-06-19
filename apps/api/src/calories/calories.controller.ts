import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CaloriesService } from './calories.service';
import { DailyCalorieSummary, MealLogResponse } from './calories.types';
import { AddDishMealDto } from './dto/add-dish-meal.dto';
import { AddProductMealDto } from './dto/add-product-meal.dto';
import { SetCalorieGoalDto } from './dto/set-calorie-goal.dto';

@ApiTags('calories')
@Controller('calories')
export class CaloriesController {
  constructor(private readonly caloriesService: CaloriesService) {}

  @Post(':userId/goals')
  @ApiCreatedResponse({ description: 'Created a new daily calorie goal.' })
  setGoal(
    @Param('userId') userId: string,
    @Body() dto: SetCalorieGoalDto,
  ): Promise<DailyCalorieSummary> {
    return this.caloriesService.setGoal(userId, dto);
  }

  @Post(':userId/meals')
  @ApiCreatedResponse({ description: 'Logged a dish meal.' })
  addDishMeal(
    @Param('userId') userId: string,
    @Body() dto: AddDishMealDto,
  ): Promise<MealLogResponse> {
    return this.caloriesService.addDishMeal(userId, dto);
  }

  @Post(':userId/products')
  @ApiCreatedResponse({ description: 'Logged a standalone product.' })
  addProductMeal(
    @Param('userId') userId: string,
    @Body() dto: AddProductMealDto,
  ): Promise<MealLogResponse> {
    return this.caloriesService.addProductMeal(userId, dto);
  }

  @Get(':userId/today')
  @ApiOkResponse({ description: "Today's calorie summary." })
  getTodaySummary(@Param('userId') userId: string): Promise<DailyCalorieSummary> {
    return this.caloriesService.getTodaySummary(userId);
  }

  @Get(':userId/daily-summary')
  @ApiQuery({ name: 'date', required: false, example: '2026-06-19' })
  @ApiOkResponse({ description: 'Daily calorie summary for a date.' })
  getDailySummary(
    @Param('userId') userId: string,
    @Query('date') date?: string,
  ): Promise<DailyCalorieSummary> {
    return this.caloriesService.getDailySummary(userId, date);
  }
}
