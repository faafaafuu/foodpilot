import { Prisma } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { RecommendationsService } from '../src/recommendations/recommendations.service';

describe('RecommendationsService', () => {
  it('ranks favorite meal-prep dishes and excludes disliked ingredients', async () => {
    const prisma = createPrismaMock({
      preferences: [
        preference('FAVORITE_DISH', 'ленивые голубцы'),
        preference('DISLIKED_PRODUCT', 'яйца'),
        preference('MEAL_STYLE', 'готовка на несколько дней'),
      ],
      dishes: [
        dish({
          slug: 'lazy-cabbage-rolls',
          name: 'Ленивые голубцы',
          caloriesPerServing: 430,
          ingredients: ['капуста', 'фарш говяжий', 'рис'],
        }),
        dish({
          slug: 'okroshka-with-eggs',
          name: 'Окрошка с яйцами',
          caloriesPerServing: 280,
          ingredients: ['кефир 1%', 'яйца'],
        }),
        dish({
          slug: 'meatballs-tomato-sauce',
          name: 'Тефтели в томатном соусе',
          caloriesPerServing: 390,
          ingredients: ['фарш говяжий', 'рис', 'томаты в собственном соку'],
        }),
      ],
    });
    const service = new RecommendationsService(prisma as unknown as PrismaService);

    const response = await service.recommendDishes('user-1', {
      remainingCalories: 1200,
      limit: 3,
      date: '2026-06-19',
    });

    expect(response.remainingCalories).toBe(1200);
    expect(response.recommendations.map((item) => item.dish.slug)).toEqual([
      'lazy-cabbage-rolls',
      'meatballs-tomato-sauce',
    ]);
    expect(response.recommendations[0].reason).toContain('любимым блюдом');
    expect(response.recommendations[0].matchedPreferences).toContain('Ленивые голубцы');
  });

  it('uses daily calorie context when remaining calories are not provided', async () => {
    const prisma = createPrismaMock({
      dailyCalories: 1800,
      mealCalories: [600],
      preferences: [preference('MEAL_STYLE', 'готовка на несколько дней')],
      dishes: [
        dish({
          slug: 'cold-beet-soup',
          name: 'Холодный свекольник',
          caloriesPerServing: 230,
          ingredients: ['свекла', 'кефир 1%'],
        }),
      ],
    });
    const service = new RecommendationsService(prisma as unknown as PrismaService);

    const response = await service.recommendDishes('user-1', { date: '2026-06-19' });

    expect(response.dailyLimit).toBe(1800);
    expect(response.consumedCalories).toBe(600);
    expect(response.remainingCalories).toBe(1200);
    expect(response.recommendations[0].dish.slug).toBe('cold-beet-soup');
  });

  it('builds a weekly menu from ranked recommendations', async () => {
    const prisma = createPrismaMock({
      preferences: [
        preference('FAVORITE_DISH', 'ленивые голубцы'),
        preference('MEAL_STYLE', 'готовка на несколько дней'),
      ],
      dishes: [
        dish({ slug: 'lazy-cabbage-rolls', name: 'Ленивые голубцы', caloriesPerServing: 430 }),
        dish({ slug: 'cold-beet-soup', name: 'Холодный свекольник', caloriesPerServing: 230 }),
        dish({
          slug: 'meatballs-tomato-sauce',
          name: 'Тефтели в томатном соусе',
          caloriesPerServing: 390,
        }),
      ],
    });
    const service = new RecommendationsService(prisma as unknown as PrismaService);

    const response = await service.recommendWeeklyMenu('user-1', {
      days: 3,
      date: '2026-06-19',
    });

    expect(response.days).toHaveLength(3);
    expect(response.days[0].meals).toHaveLength(2);
    expect(response.groceryCandidateDishSlugs).toContain('lazy-cabbage-rolls');
    expect(response.estimatedAverageCalories).toBeGreaterThan(0);
  });
});

function createPrismaMock(options: {
  dailyCalories?: number;
  mealCalories?: number[];
  preferences: Array<ReturnType<typeof preference>>;
  dishes: Array<ReturnType<typeof dish>>;
}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'demo@foodpilot.local',
        displayName: 'Demo',
        createdAt: new Date(),
        updatedAt: new Date(),
        profile: {
          dailyCalorieLimit: options.dailyCalories ?? 1800,
          weeklyBudgetCents: 700000,
        },
        preferences: options.preferences,
      }),
    },
    dish: {
      findMany: jest.fn().mockResolvedValue(options.dishes),
    },
    calorieGoal: {
      findFirst: jest.fn().mockResolvedValue(
        options.dailyCalories
          ? {
              dailyCalories: options.dailyCalories,
            }
          : null,
      ),
    },
    mealLog: {
      findMany: jest
        .fn()
        .mockResolvedValue((options.mealCalories ?? []).map((calories) => ({ calories }))),
    },
  };
}

function preference(type: string, value: string) {
  return {
    id: `${type}-${value}`,
    userId: 'user-1',
    type,
    value,
    notes: null,
    weight: 5,
    repeatFrequency: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function dish(options: {
  slug: string;
  name: string;
  caloriesPerServing: number;
  ingredients?: string[];
}) {
  return {
    id: options.slug,
    slug: options.slug,
    name: options.name,
    description: `${options.name}: простое домашнее блюдо.`,
    mealPrepFriendly: true,
    budgetTier: 'NORMAL',
    servings: 6,
    caloriesPerServing: options.caloriesPerServing,
    proteinGrams: new Prisma.Decimal(20),
    fatGrams: new Prisma.Decimal(10),
    carbGrams: new Prisma.Decimal(30),
    tags: ['home', 'simple', 'filling'],
    createdAt: new Date(),
    updatedAt: new Date(),
    recipe: {
      id: `${options.slug}-recipe`,
      dishId: options.slug,
      summary: 'Короткий рецепт.',
      instructions: ['Приготовить.'],
      prepMinutes: 20,
      cookMinutes: 40,
      servings: 6,
      createdAt: new Date(),
      updatedAt: new Date(),
      ingredients: (options.ingredients ?? ['капуста']).map((name, index) => ({
        id: `${options.slug}-ingredient-${index}`,
        recipeId: `${options.slug}-recipe`,
        ingredientId: name,
        quantity: new Prisma.Decimal(100),
        unit: 'GRAM',
        note: null,
        sortOrder: index,
        ingredient: {
          id: name,
          name,
          normalizedName: name,
          category: 'VEGETABLES',
          defaultUnit: 'GRAM',
          caloriesPer100g: 50,
          proteinPer100g: new Prisma.Decimal(1),
          fatPer100g: new Prisma.Decimal(1),
          carbPer100g: new Prisma.Decimal(5),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })),
    },
  };
}
