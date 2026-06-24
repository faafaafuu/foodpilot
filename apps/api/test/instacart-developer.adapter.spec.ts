import { InstacartDeveloperAdapter } from '../src/external-stores/instacart-developer.adapter';
import { GroceryListsService } from '../src/grocery-lists/grocery-lists.service';

describe('InstacartDeveloperAdapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.INSTACART_API_KEY;
    delete process.env.INSTACART_API_BASE_URL;
    delete process.env.INSTACART_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports whether the real Instacart integration is configured', () => {
    const adapter = new InstacartDeveloperAdapter(
      createGroceryListsServiceMock() as unknown as GroceryListsService,
    );

    expect(adapter.getStatus()).toEqual({
      provider: 'instacart',
      configured: false,
      productionReady: false,
      mode: 'production',
      baseUrl: 'https://connect.instacart.com',
      capabilities: ['nearby_retailers', 'shopping_list_link', 'marketplace_checkout_redirect'],
      requiredEnv: ['INSTACART_API_KEY', 'INSTACART_ENV=production'],
      missingEnv: ['INSTACART_API_KEY'],
      checkoutBehavior: 'REDIRECT_TO_PROVIDER',
    });
  });

  it('requires an API key before creating a shopping list link', async () => {
    const adapter = new InstacartDeveloperAdapter(
      createGroceryListsServiceMock() as unknown as GroceryListsService,
    );

    await expect(adapter.createShoppingListLink('list-1')).rejects.toThrow('INSTACART_API_KEY');
  });

  it('creates an Instacart shopping list link from a FoodPilot grocery list', async () => {
    process.env.INSTACART_API_KEY = 'test-instacart-key';
    process.env.INSTACART_API_BASE_URL = 'https://connect.instacart.test';
    process.env.INSTACART_ENV = 'production';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ products_link_url: 'https://instacart.test/list' })),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const adapter = new InstacartDeveloperAdapter(
      createGroceryListsServiceMock() as unknown as GroceryListsService,
    );

    const response = await adapter.createShoppingListLink('list-1', {
      expiresInDays: 14,
      partnerLinkbackUrl: 'https://foodpilot.local/lists/list-1',
    });

    expect(response).toEqual({
      provider: 'instacart',
      groceryListId: 'list-1',
      title: 'FoodPilot groceries',
      productsLinkUrl: 'https://instacart.test/list',
      lineItemCount: 2,
      checkoutBehavior: 'REDIRECT_TO_PROVIDER',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://connect.instacart.test/idp/v1/products/products_link',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer test-instacart-key',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        title: 'FoodPilot groceries',
        link_type: 'shopping_list',
        expires_in: 14,
        line_items: [
          {
            name: 'Фарш говяжий',
            display_text: 'Фарш говяжий',
            line_item_measurements: [{ quantity: 1200, unit: 'gram' }],
          },
          {
            name: 'Лук',
            display_text: 'Лук',
            line_item_measurements: [{ quantity: 4, unit: 'each' }],
          },
        ],
      }),
    );
  });

  it('blocks checkout links when Instacart is left in development mode', async () => {
    process.env.INSTACART_API_KEY = 'test-instacart-key';
    process.env.INSTACART_ENV = 'development';
    const adapter = new InstacartDeveloperAdapter(
      createGroceryListsServiceMock() as unknown as GroceryListsService,
    );

    expect(adapter.getStatus()).toEqual(
      expect.objectContaining({
        configured: true,
        productionReady: false,
        mode: 'development',
        baseUrl: 'https://connect.dev.instacart.tools',
        missingEnv: [
          'INSTACART_ENV=production',
          'INSTACART_API_BASE_URL=https://connect.instacart.com',
        ],
      }),
    );
    await expect(adapter.createShoppingListLink('list-1')).rejects.toThrow(
      'Instacart production checkout is not configured',
    );
  });
});

function createGroceryListsServiceMock() {
  return {
    getGroceryList: jest.fn().mockResolvedValue({
      id: 'list-1',
      userId: 'user-1',
      title: 'FoodPilot groceries',
      status: 'READY',
      sourceMenu: null,
      totalEstimatedCents: 100000,
      items: [
        {
          id: 'item-1',
          ingredientId: 'ingredient-beef',
          name: 'Фарш говяжий',
          category: 'MEAT',
          quantity: 1200,
          unit: 'GRAM',
          package: null,
          checked: false,
        },
        {
          id: 'item-2',
          ingredientId: 'ingredient-onion',
          name: 'Лук',
          category: 'VEGETABLES',
          quantity: 4,
          unit: 'PIECE',
          package: null,
          checked: false,
        },
      ],
    }),
  };
}
