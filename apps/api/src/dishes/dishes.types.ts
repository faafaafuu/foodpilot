import { BudgetTier, GroceryCategory, MeasurementUnit } from '@prisma/client';

export interface DishMacroResponse {
  proteinGrams: number | null;
  fatGrams: number | null;
  carbGrams: number | null;
}

export interface DishSummaryResponse {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mealPrepFriendly: boolean;
  budgetTier: BudgetTier;
  servings: number;
  caloriesPerServing: number;
  macros: DishMacroResponse;
  tags: string[];
}

export interface IngredientNutritionResponse {
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  fatPer100g: number | null;
  carbPer100g: number | null;
}

export interface RecipeIngredientResponse {
  id: string;
  quantity: number;
  unit: MeasurementUnit;
  note: string | null;
  sortOrder: number;
  ingredient: {
    id: string;
    name: string;
    normalizedName: string;
    category: GroceryCategory;
    defaultUnit: MeasurementUnit;
    nutrition: IngredientNutritionResponse;
  };
}

export interface RecipeResponse {
  id: string;
  dish: DishSummaryResponse;
  summary: string;
  instructions: string[];
  prepMinutes: number | null;
  cookMinutes: number | null;
  servings: number;
  ingredients: RecipeIngredientResponse[];
}

export interface DishDetailsResponse extends DishSummaryResponse {
  recipe: RecipeResponse | null;
}
