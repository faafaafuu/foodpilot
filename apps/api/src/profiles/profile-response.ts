import { DietGoal, FoodPreferenceType, Prisma } from '@prisma/client';

export interface PreferenceResponse {
  id: string;
  type: FoodPreferenceType;
  value: string;
  notes: string | null;
  weight: number;
  repeatFrequency: number | null;
}

export interface ProfileResponse {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
  };
  profile: {
    weightKg: number | null;
    heightCm: number | null;
    age: number | null;
    goal: DietGoal;
    dailyCalorieLimit: number | null;
    desiredMealsPerDay: number;
    weeklyBudgetCents: number | null;
    deliveryCity: string | null;
    preferredStores: string[];
  } | null;
  tastes: {
    favoriteDishes: PreferenceResponse[];
    dislikedProducts: PreferenceResponse[];
    mealStyles: PreferenceResponse[];
    all: PreferenceResponse[];
  };
}

export function decimalToNumber(value: Prisma.Decimal | number | null): number | null {
  if (value === null) {
    return null;
  }

  return typeof value === 'number' ? value : value.toNumber();
}
