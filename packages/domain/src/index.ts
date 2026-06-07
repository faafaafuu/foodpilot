export type DietGoal = 'weight_loss' | 'maintenance' | 'muscle_gain';

export interface FoodPilotContext {
  goal: DietGoal;
  mealStyle: string;
  favoriteDishes: string[];
  dislikedProducts: string[];
  priorities: string[];
}

export const defaultFoodPilotContext: FoodPilotContext = {
  goal: 'weight_loss',
  mealStyle: 'simple_home_meal_prep',
  favoriteDishes: ['ленивые голубцы', 'холодный свекольник'],
  dislikedProducts: ['яйца', 'каши', 'авокадо'],
  priorities: ['сытность', 'нормальная цена', 'простота', 'готовка на несколько дней'],
};

export function shouldExcludeIngredient(
  ingredientName: string,
  dislikedProducts: string[],
): boolean {
  const normalizedIngredient = ingredientName.trim().toLocaleLowerCase('ru-RU');

  return dislikedProducts.some((product) =>
    normalizedIngredient.includes(product.trim().toLocaleLowerCase('ru-RU')),
  );
}
