import { defaultFoodPilotContext, shouldExcludeIngredient, starterDishes } from './index';

describe('FoodPilot domain defaults', () => {
  it('captures the first MVP taste context', () => {
    expect(defaultFoodPilotContext.goal).toBe('weight_loss');
    expect(defaultFoodPilotContext.favoriteDishes).toContain('ленивые голубцы');
    expect(defaultFoodPilotContext.favoriteDishes).toContain('холодный свекольник');
    expect(defaultFoodPilotContext.dislikedProducts).toEqual(
      expect.arrayContaining(['яйца', 'каши']),
    );
  });

  it('detects disliked ingredients by normalized name', () => {
    expect(shouldExcludeIngredient('Куриные яйца', ['яйца'])).toBe(true);
    expect(shouldExcludeIngredient('Капуста белокочанная', ['яйца'])).toBe(false);
  });

  it('contains the first test dish set without disliked ingredients', () => {
    expect(starterDishes).toHaveLength(10);
    expect(starterDishes.map((dish) => dish.name)).toEqual(
      expect.arrayContaining(['Ленивые голубцы', 'Холодный свекольник', 'Окрошка без яиц']),
    );

    const allRecipeIngredientNames = starterDishes.flatMap((dish) =>
      dish.recipe.ingredients.map((ingredient) => ingredient.normalizedName),
    );

    expect(allRecipeIngredientNames.some((name) => shouldExcludeIngredient(name, ['яйца']))).toBe(
      false,
    );
  });
});
