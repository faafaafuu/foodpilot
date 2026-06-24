import { Prisma } from '@prisma/client';
import { CartBuilderService } from '../src/cart-builder/cart-builder.service';
import { GroceryListsService } from '../src/grocery-lists/grocery-lists.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('CartBuilderService', () => {
  it('builds a confirmation-required cart from grocery list items', async () => {
    const prisma = createPrismaMock();
    const service = new CartBuilderService(
      prisma as unknown as PrismaService,
      createGroceryListsServiceMock() as unknown as GroceryListsService,
    );

    const cart = await service.buildCartFromGroceryList('list-1', { storeCode: 'mock-store' });

    expect(cart.status).toBe('READY_FOR_CONFIRMATION');
    expect(cart.requiresConfirmation).toBe(true);
    expect(cart.subtotalCents).toBe(102000);
    expect(cart.items).toEqual([
      expect.objectContaining({
        name: 'Фарш говяжий',
        quantity: 2,
        totalPriceCents: 90000,
        replacementForName: null,
      }),
      expect.objectContaining({
        name: 'Капуста',
        quantity: 1,
        totalPriceCents: 12000,
        replacementForName: 'Неизвестный овощ',
      }),
    ]);
  });

  it('generates a grocery list and builds a confirmation-required cart from menu dishes', async () => {
    const prisma = createPrismaMock();
    const groceryListsService = createGroceryListsServiceMock();
    const service = new CartBuilderService(
      prisma as unknown as PrismaService,
      groceryListsService as unknown as GroceryListsService,
    );

    const result = await service.buildCartFromMenu({
      userId: 'user-1',
      menu: {
        title: 'Меню на неделю',
        storeCode: 'mock-store',
        dishes: [{ slug: 'lazy-cabbage-rolls', servings: 8 }],
      },
    });

    expect(groceryListsService.generateFromMenu).toHaveBeenCalledWith('user-1', {
      title: 'Меню на неделю',
      storeCode: 'mock-store',
      dishes: [{ slug: 'lazy-cabbage-rolls', servings: 8 }],
    });
    expect(result.groceryList.id).toBe('list-1');
    expect(result.cart.status).toBe('READY_FOR_CONFIRMATION');
    expect(result.cart.requiresConfirmation).toBe(true);
    expect(result.cart.items.length).toBe(2);
  });

  it('confirms a prepared cart without placing an external order', async () => {
    const prisma = createPrismaMock();
    const service = new CartBuilderService(
      prisma as unknown as PrismaService,
      createGroceryListsServiceMock() as unknown as GroceryListsService,
    );

    await service.buildCartFromGroceryList('list-1', { storeCode: 'mock-store' });
    const cart = await service.confirmCart('cart-1');

    expect(cart.status).toBe('CONFIRMED');
    expect(cart.requiresConfirmation).toBe(false);
    expect(cart.items.length).toBe(2);
  });
});

function createGroceryListsServiceMock() {
  return {
    generateFromMenu: jest.fn().mockResolvedValue({
      id: 'list-1',
      userId: 'user-1',
      title: 'Меню на неделю',
      status: 'READY',
      sourceMenu: {
        dishes: [{ slug: 'lazy-cabbage-rolls', servings: 8 }],
      },
      totalEstimatedCents: 102000,
      items: [],
    }),
  };
}

function createPrismaMock() {
  const cart = {
    id: 'cart-1',
    userId: 'user-1',
    storeId: 'store-1',
    groceryListId: 'list-1',
    status: 'READY_FOR_CONFIRMATION',
    subtotalCents: 0,
    currency: 'RUB',
    requiresConfirmation: true,
    confirmedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const cartItems: Array<{
    id: string;
    cartId: string;
    groceryListItemId: string | null;
    storeProductId: string | null;
    name: string;
    quantity: number;
    unitPriceCents: number;
    totalPriceCents: number;
    replacementForName: string | null;
    replacementReason: string | null;
    createdAt: Date;
  }> = [];
  const products = [
    product('product-beef', 'beef', 'Фарш говяжий', 'MEAT', 45000),
    product('product-cabbage', 'cabbage', 'Капуста', 'VEGETABLES', 12000),
  ];

  return {
    groceryList: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'list-1',
        userId: 'user-1',
        title: 'List',
        status: 'READY',
        sourceMenuJson: null,
        totalEstimatedCents: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          groceryItem('item-beef', 'beef', 'Фарш говяжий', 'MEAT', 1200),
          groceryItem('item-unknown', 'unknown', 'Неизвестный овощ', 'VEGETABLES', 300),
        ],
      }),
    },
    store: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'store-1',
        code: 'mock-store',
        name: 'Mock Store',
        adapterKey: 'mock',
        city: 'Москва',
        isMock: true,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    storeProduct: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const found =
          products.find(
            (item) =>
              item.storeId === where.storeId &&
              item.available &&
              (where.ingredientId
                ? item.ingredientId === where.ingredientId
                : item.category === where.category),
          ) ?? null;

        return Promise.resolve(found);
      }),
    },
    cart: {
      create: jest.fn().mockResolvedValue(cart),
      update: jest.fn().mockImplementation(({ data }) => {
        Object.assign(cart, data);
        return Promise.resolve(cart);
      }),
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve({
          ...cart,
          items: cartItems,
        }),
      ),
    },
    cartItem: {
      create: jest.fn().mockImplementation(({ data }) => {
        const item = {
          id: `cart-item-${cartItems.length + 1}`,
          createdAt: new Date(),
          ...data,
          replacementForName: data.replacementForName ?? null,
          replacementReason: data.replacementReason ?? null,
        };
        cartItems.push(item);
        return Promise.resolve(item);
      }),
    },
  };
}

function groceryItem(
  id: string,
  ingredientId: string,
  name: string,
  category: string,
  quantity: number,
) {
  return {
    id,
    groceryListId: 'list-1',
    ingredientId,
    name,
    category,
    quantity: new Prisma.Decimal(quantity),
    unit: 'GRAM',
    packageQuantity: new Prisma.Decimal(500),
    packageUnit: 'GRAM',
    checked: false,
    createdAt: new Date(),
  };
}

function product(
  id: string,
  ingredientId: string,
  name: string,
  category: string,
  priceCents: number,
) {
  return {
    id,
    storeId: 'store-1',
    ingredientId,
    externalId: `mock-${ingredientId}`,
    name,
    normalizedName: name.toLocaleLowerCase('ru-RU'),
    category,
    priceCents,
    packageSize: new Prisma.Decimal(1000),
    packageUnit: 'GRAM',
    available: true,
    qualityTier: 'NORMAL',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
