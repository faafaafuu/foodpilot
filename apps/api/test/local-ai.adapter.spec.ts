import { FoodPreferenceType } from '@prisma/client';
import { LocalAiAdapter } from '../src/ai/local-ai.adapter';

describe('LocalAiAdapter', () => {
  it('saves favorite dishes and returns weekly menu intent', async () => {
    const prisma = createPrismaMock();
    const adapter = new LocalAiAdapter(
      prisma as never,
      caloriesService(),
      dishesService(),
      recommendationsService(),
      groceryListsService(),
    );

    const response = await adapter.handle(
      'user-1',
      'Хочу меню на неделю. Люблю ленивые голубцы и холодный свекольник.',
    );

    expect(response.intent).toBe('WEEKLY_MENU');
    expect(response.actions).toContain('saved_favorite:lazy-cabbage-rolls');
    expect(response.actions).toContain('saved_favorite:cold-beet-soup');
    expect(prisma.foodPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_type_value: {
            userId: 'user-1',
            type: FoodPreferenceType.FAVORITE_DISH,
            value: 'ленивые голубцы',
          },
        },
      }),
    );
  });

  it('answers calories-left requests through the calorie tool', async () => {
    const adapter = new LocalAiAdapter(
      createPrismaMock() as never,
      caloriesService(),
      dishesService(),
      recommendationsService(),
      groceryListsService(),
    );

    const response = await adapter.handle('user-1', 'Сколько калорий осталось?');

    expect(response.intent).toBe('CALORIES_LEFT');
    expect(response.reply).toContain('1200 ккал');
  });

  it('generates a grocery list through menu and grocery tools', async () => {
    const adapter = new LocalAiAdapter(
      createPrismaMock() as never,
      caloriesService(),
      dishesService(),
      recommendationsService(),
      groceryListsService(),
    );

    const response = await adapter.handle('user-1', 'Собери список покупок');

    expect(response.intent).toBe('GROCERY_LIST');
    expect(response.actions).toContain('generated_grocery_list');
    expect(response.reply).toContain('2 позиций');
  });
});

function createPrismaMock() {
  return {
    foodPreference: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
}

function caloriesService() {
  return {
    getTodaySummary: jest.fn().mockResolvedValue({
      date: '2026-06-19',
      dailyLimit: 1800,
      consumedCalories: 600,
      remainingCalories: 1200,
      macros: { proteinGrams: 30, fatGrams: 20, carbGrams: 40 },
      goals: { proteinGrams: null, fatGrams: null, carbGrams: null },
      meals: [],
    }),
  } as never;
}

function dishesService() {
  return {
    listDishes: jest.fn().mockResolvedValue([
      {
        slug: 'lazy-cabbage-rolls',
        name: 'Ленивые голубцы',
      },
      {
        slug: 'cold-beet-soup',
        name: 'Холодный свекольник',
      },
    ]),
    getRecipe: jest.fn().mockResolvedValue({
      instructions: ['Обжарить овощи.', 'Тушить.'],
      ingredients: [
        {
          ingredient: { name: 'Капуста' },
          quantity: 1000,
          unit: 'GRAM',
        },
      ],
    }),
  } as never;
}

function recommendationsService() {
  return {
    recommendWeeklyMenu: jest.fn().mockResolvedValue({
      estimatedAverageCalories: 700,
      groceryCandidateDishSlugs: ['lazy-cabbage-rolls', 'cold-beet-soup'],
    }),
    recommendDishes: jest.fn().mockResolvedValue({
      recommendations: [
        { dish: { name: 'Ленивые голубцы' } },
        { dish: { name: 'Холодный свекольник' } },
      ],
    }),
  } as never;
}

function groceryListsService() {
  return {
    generateFromMenu: jest.fn().mockResolvedValue({
      items: [{ name: 'Капуста' }, { name: 'Свекла' }],
      totalEstimatedCents: 150000,
    }),
  } as never;
}
