import { MealType } from '@prisma/client';

export interface MealLogResponse {
  id: string;
  dishId: string | null;
  name: string;
  mealType: MealType | null;
  loggedAt: string;
  servings: number;
  calories: number;
  proteinGrams: number | null;
  fatGrams: number | null;
  carbGrams: number | null;
  notes: string | null;
}

export interface DailyCalorieSummary {
  date: string;
  dailyLimit: number;
  consumedCalories: number;
  remainingCalories: number;
  macros: {
    proteinGrams: number;
    fatGrams: number;
    carbGrams: number;
  };
  goals: {
    proteinGrams: number | null;
    fatGrams: number | null;
    carbGrams: number | null;
  };
  meals: MealLogResponse[];
}
