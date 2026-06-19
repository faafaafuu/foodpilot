import { MealType } from '@prisma/client';
import { DishSummaryResponse } from '../dishes/dishes.types';

export interface RecommendedDishResponse {
  dish: DishSummaryResponse;
  score: number;
  reason: string;
  matchedPreferences: string[];
  warnings: string[];
}

export interface DishRecommendationsResponse {
  userId: string;
  date: string;
  dailyLimit: number;
  consumedCalories: number;
  remainingCalories: number;
  recommendations: RecommendedDishResponse[];
}

export interface WeeklyMenuDayResponse {
  day: number;
  meals: Array<{
    mealType: MealType;
    dish: DishSummaryResponse;
    reason: string;
  }>;
  estimatedCalories: number;
}

export interface WeeklyMenuResponse {
  userId: string;
  days: WeeklyMenuDayResponse[];
  estimatedAverageCalories: number;
  groceryCandidateDishSlugs: string[];
}
