import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DishesService } from '../src/dishes/dishes.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('DishesService', () => {
  it('lists dishes with calorie and macro summary', async () => {
    const prisma = {
      dish: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'dish-1',
            slug: 'lazy-cabbage-rolls',
            name: 'Ленивые голубцы',
            description: 'Сытное блюдо на несколько дней.',
            mealPrepFriendly: true,
            budgetTier: 'NORMAL',
            servings: 8,
            caloriesPerServing: 430,
            proteinGrams: new Prisma.Decimal(28),
            fatGrams: new Prisma.Decimal(21),
            carbGrams: new Prisma.Decimal(34),
            tags: ['meal-prep'],
          },
        ]),
      },
    };
    const service = new DishesService(prisma as unknown as PrismaService);

    await expect(service.listDishes()).resolves.toEqual([
      {
        id: 'dish-1',
        slug: 'lazy-cabbage-rolls',
        name: 'Ленивые голубцы',
        description: 'Сытное блюдо на несколько дней.',
        mealPrepFriendly: true,
        budgetTier: 'NORMAL',
        servings: 8,
        caloriesPerServing: 430,
        macros: {
          proteinGrams: 28,
          fatGrams: 21,
          carbGrams: 34,
        },
        tags: ['meal-prep'],
      },
    ]);
    expect(prisma.dish.findMany).toHaveBeenCalledWith({
      orderBy: [{ mealPrepFriendly: 'desc' }, { name: 'asc' }],
    });
  });

  it('returns a short recipe with ordered ingredient details', async () => {
    const prisma = {
      dish: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'dish-1',
          slug: 'cold-beet-soup',
          name: 'Холодный свекольник',
          description: 'Без яиц.',
          mealPrepFriendly: true,
          budgetTier: 'LOW',
          servings: 4,
          caloriesPerServing: 230,
          proteinGrams: new Prisma.Decimal(10),
          fatGrams: new Prisma.Decimal(6),
          carbGrams: new Prisma.Decimal(34),
          tags: ['cold-soup', 'no-eggs'],
          recipe: {
            id: 'recipe-1',
            dishId: 'dish-1',
            summary: 'Холодный свекольник без яиц.',
            instructions: ['Отварить свеклу.', 'Охладить.'],
            prepMinutes: 20,
            cookMinutes: 35,
            servings: 4,
            createdAt: new Date(),
            updatedAt: new Date(),
            ingredients: [
              {
                id: 'recipe-ingredient-1',
                recipeId: 'recipe-1',
                ingredientId: 'ingredient-1',
                quantity: new Prisma.Decimal(600),
                unit: 'GRAM',
                note: null,
                sortOrder: 0,
                ingredient: {
                  id: 'ingredient-1',
                  name: 'Свекла',
                  normalizedName: 'свекла',
                  category: 'VEGETABLES',
                  defaultUnit: 'GRAM',
                  caloriesPer100g: 43,
                  proteinPer100g: new Prisma.Decimal(1.6),
                  fatPer100g: new Prisma.Decimal(0.2),
                  carbPer100g: new Prisma.Decimal(10),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
            ],
          },
        }),
      },
    };
    const service = new DishesService(prisma as unknown as PrismaService);

    const recipe = await service.getRecipe('cold-beet-soup');

    expect(recipe.summary).toBe('Холодный свекольник без яиц.');
    expect(recipe.dish.caloriesPerServing).toBe(230);
    expect(recipe.ingredients).toEqual([
      {
        id: 'recipe-ingredient-1',
        quantity: 600,
        unit: 'GRAM',
        note: null,
        sortOrder: 0,
        ingredient: {
          id: 'ingredient-1',
          name: 'Свекла',
          normalizedName: 'свекла',
          category: 'VEGETABLES',
          defaultUnit: 'GRAM',
          nutrition: {
            caloriesPer100g: 43,
            proteinPer100g: 1.6,
            fatPer100g: 0.2,
            carbPer100g: 10,
          },
        },
      },
    ]);
    expect(prisma.dish.findUnique).toHaveBeenCalledWith({
      where: { slug: 'cold-beet-soup' },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: { ingredient: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
  });

  it('throws when dish does not exist', async () => {
    const prisma = {
      dish: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new DishesService(prisma as unknown as PrismaService);

    await expect(service.getDish('missing')).rejects.toThrow(NotFoundException);
  });
});
