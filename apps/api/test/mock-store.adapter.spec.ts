import { Prisma } from '@prisma/client';
import { MockStoreAdapter } from '../src/store-adapters/mock-store.adapter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MockStoreAdapter', () => {
  it('searches mock products', async () => {
    const prisma = createPrismaMock();
    const adapter = new MockStoreAdapter(prisma as unknown as PrismaService);

    const products = await adapter.searchProduct('фарш');

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({
      id: 'product-beef',
      name: 'Фарш говяжий',
      priceCents: 45000,
      packageSize: 1000,
      available: true,
    });
  });

  it('adds products to a confirmation-required draft cart', async () => {
    const prisma = createPrismaMock();
    const adapter = new MockStoreAdapter(prisma as unknown as PrismaService);

    const cart = await adapter.addToCart({
      userId: 'user-1',
      productId: 'product-beef',
      quantity: 2,
    });

    expect(cart.subtotalCents).toBe(90000);
    expect(cart.requiresConfirmation).toBe(true);
    expect(cart.items).toEqual([
      expect.objectContaining({
        name: 'Фарш говяжий',
        quantity: 2,
        totalPriceCents: 90000,
      }),
    ]);
  });

  it('replaces products in a cart and recalculates subtotal', async () => {
    const prisma = createPrismaMock();
    const adapter = new MockStoreAdapter(prisma as unknown as PrismaService);

    await adapter.addToCart({ userId: 'user-1', productId: 'product-beef', quantity: 1 });
    const cart = await adapter.replaceProduct('cart-1', 'product-beef', 'product-turkey');

    expect(cart.subtotalCents).toBe(39000);
    expect(cart.items[0]).toMatchObject({
      storeProductId: 'product-turkey',
      name: 'Фарш индейки',
      replacementForName: 'Фарш говяжий',
    });
  });
});

function createPrismaMock() {
  const products = [
    product('product-beef', 'Фарш говяжий', 45000),
    product('product-turkey', 'Фарш индейки', 39000),
  ];
  const cart = {
    id: 'cart-1',
    userId: 'user-1',
    storeId: 'store-1',
    groceryListId: null,
    status: 'DRAFT',
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

  return {
    store: {
      findFirst: jest.fn().mockResolvedValue({
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
      findMany: jest.fn().mockResolvedValue(products),
      findUnique: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(products.find((item) => item.id === where.id) ?? null),
        ),
    },
    cart: {
      create: jest.fn().mockResolvedValue(cart),
      findUnique: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(
          where.id === cart.id
            ? {
                ...cart,
                items: cartItems.map((item) => ({
                  ...item,
                  storeProduct:
                    products.find((productItem) => productItem.id === item.storeProductId) ?? null,
                })),
              }
            : null,
        ),
      ),
      update: jest.fn().mockImplementation(({ data }) => {
        cart.subtotalCents = data.subtotalCents;
        cart.requiresConfirmation = data.requiresConfirmation;
        return Promise.resolve(cart);
      }),
    },
    cartItem: {
      findFirst: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(
            cartItems.find(
              (item) =>
                item.cartId === where.cartId &&
                (where.storeProductId === undefined ||
                  item.storeProductId === where.storeProductId),
            ) ?? null,
          ),
        ),
      findMany: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(cartItems.filter((item) => item.cartId === where.cartId)),
        ),
      create: jest.fn().mockImplementation(({ data }) => {
        const item = {
          id: `cart-item-${cartItems.length + 1}`,
          groceryListItemId: null,
          replacementForName: null,
          replacementReason: null,
          createdAt: new Date(),
          ...data,
        };
        cartItems.push(item);
        return Promise.resolve(item);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const index = cartItems.findIndex((item) => item.id === where.id);
        cartItems[index] = { ...cartItems[index], ...data };
        return Promise.resolve(cartItems[index]);
      }),
    },
  };
}

function product(id: string, name: string, priceCents: number) {
  return {
    id,
    storeId: 'store-1',
    ingredientId: id,
    externalId: `mock-${id}`,
    name,
    normalizedName: name.toLocaleLowerCase('ru-RU'),
    category: 'MEAT',
    priceCents,
    packageSize: new Prisma.Decimal(1000),
    packageUnit: 'GRAM',
    available: true,
    qualityTier: 'NORMAL',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
