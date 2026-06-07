import { defaultFoodPilotContext, shouldExcludeIngredient } from './index';

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
});
