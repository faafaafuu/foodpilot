import { Prisma } from '@prisma/client';
import { GroceryListsService } from '../src/grocery-lists/grocery-lists.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('GroceryListsService', () => {
  it('generates a grocery list with merged ingredients and package rounding', async () => {
    const createdItems: Array<Record<string, unknown>> = [];
    const prisma = createPrismaMock(createdItems);
    const service = new GroceryListsService(prisma as unknown as PrismaService);

    const response = await service.generateFromMenu('user-1', {
      title: 'Меню на неделю',
      dishes: [
        { slug: 'lazy-cabbage-rolls', servings: 8 },
        { slug: 'stuffed-peppers', servings: 6 },
      ],
    });

    const cabbage = response.items.find((item) => item.name === 'Капуста');
    const beef = response.items.find((item) => item.name === 'Фарш говяжий');

    expect(cabbage?.quantity).toBe(1600);
    expect(cabbage?.package?.packageCount).toBe(4);
    expect(beef?.quantity).toBe(2000);
    expect(beef?.package?.packageCount).toBe(2);
    expect(response.totalEstimatedCents).toBe(162000);
    expect(prisma.groceryList.update).toHaveBeenCalledWith({
      where: { id: 'list-1' },
      data: { totalEstimatedCents: 162000 },
    });
  });

  it('exports a readable grocery list grouped by category', async () => {
    const prisma = createPrismaMock([]);
    const service = new GroceryListsService(prisma as unknown as PrismaService);

    const response = await service.exportGroceryList('list-1');

    expect(response.text).toContain('Demo grocery list');
    expect(response.text).toContain('Мясо');
    expect(response.text).toContain('- Фарш говяжий: 1200 г; купить 2 x 1000 г');
    expect(response.text).toContain('Овощи');
  });
});

function createPrismaMock(createdItems: Array<Record<string, unknown>>) {
  const list = {
    id: 'list-1',
    userId: 'user-1',
    title: 'Demo grocery list',
    status: 'READY',
    sourceMenuJson: { dishes: [{ slug: 'lazy-cabbage-rolls' }] },
    totalEstimatedCents: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
    },
    dish: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          dish('lazy-cabbage-rolls', 8, [
            recipeItem('beef', 'Фарш говяжий', 'MEAT', 1200),
            recipeItem('cabbage', 'Капуста', 'VEGETABLES', 1600),
          ]),
          dish('stuffed-peppers', 6, [
            recipeItem('beef', 'Фарш говяжий', 'MEAT', 800),
            recipeItem('pepper', 'Перец сладкий', 'VEGETABLES', 900),
          ]),
        ]),
    },
    groceryList: {
      create: jest.fn().mockResolvedValue(list),
      update: jest.fn().mockImplementation(({ data }) => {
        list.totalEstimatedCents = data.totalEstimatedCents;
        return Promise.resolve({ ...list });
      }),
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve({
          ...list,
          items:
            createdItems.length > 0
              ? createdItems.map((item, index) => ({
                  id: `item-${index}`,
                  groceryListId: 'list-1',
                  ingredientId: item.ingredientId,
                  name: item.name,
                  category: item.category,
                  quantity: item.quantity,
                  unit: item.unit,
                  packageQuantity: item.packageQuantity ?? null,
                  packageUnit: item.packageUnit ?? null,
                  checked: false,
                  createdAt: new Date(),
                }))
              : [
                  groceryItem('Фарш говяжий', 'MEAT', 1200, 1000),
                  groceryItem('Капуста', 'VEGETABLES', 1600, 500),
                ],
        }),
      ),
    },
    groceryListItem: {
      create: jest.fn().mockImplementation(({ data }) => {
        createdItems.push(data);
        return Promise.resolve({ id: `item-${createdItems.length}`, ...data });
      }),
    },
    storeProduct: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const productByIngredient: Record<string, { packageSize: number; priceCents: number }> = {
          beef: { packageSize: 1000, priceCents: 45000 },
          cabbage: { packageSize: 500, priceCents: 12000 },
          pepper: { packageSize: 500, priceCents: 12000 },
        };
        const product = productByIngredient[where.ingredientId];

        return Promise.resolve(
          product
            ? {
                id: `${where.ingredientId}-product`,
                storeId: 'store-1',
                ingredientId: where.ingredientId,
                externalId: `mock-${where.ingredientId}`,
                name: where.ingredientId,
                normalizedName: where.ingredientId,
                category: 'OTHER',
                priceCents: product.priceCents,
                packageSize: new Prisma.Decimal(product.packageSize),
                packageUnit: 'GRAM',
                available: true,
                qualityTier: 'NORMAL',
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            : null,
        );
      }),
    },
  };
}

function dish(slug: string, servings: number, ingredients: Array<ReturnType<typeof recipeItem>>) {
  return {
    id: slug,
    slug,
    name: slug,
    description: null,
    mealPrepFriendly: true,
    budgetTier: 'NORMAL',
    servings,
    caloriesPerServing: 400,
    proteinGrams: null,
    fatGrams: null,
    carbGrams: null,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    recipe: {
      id: `${slug}-recipe`,
      dishId: slug,
      summary: 'Recipe',
      instructions: [],
      prepMinutes: 10,
      cookMinutes: 30,
      servings,
      createdAt: new Date(),
      updatedAt: new Date(),
      ingredients,
    },
  };
}

function recipeItem(id: string, name: string, category: string, quantity: number) {
  return {
    id: `${id}-recipe-item`,
    recipeId: 'recipe-1',
    ingredientId: id,
    quantity: new Prisma.Decimal(quantity),
    unit: 'GRAM',
    note: null,
    sortOrder: 0,
    ingredient: {
      id,
      name,
      normalizedName: name.toLocaleLowerCase('ru-RU'),
      category,
      defaultUnit: 'GRAM',
      caloriesPer100g: 100,
      proteinPer100g: null,
      fatPer100g: null,
      carbPer100g: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

function groceryItem(name: string, category: string, quantity: number, packageSize: number) {
  return {
    id: `${name}-item`,
    groceryListId: 'list-1',
    ingredientId: name,
    name,
    category,
    quantity: new Prisma.Decimal(quantity),
    unit: 'GRAM',
    packageQuantity: new Prisma.Decimal(packageSize),
    packageUnit: 'GRAM',
    checked: false,
    createdAt: new Date(),
  };
}
