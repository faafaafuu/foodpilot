import { PageStoreAdapter } from '../src/store-adapters/page-store.adapter';

describe('PageStoreAdapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('parses public VkusVill search page product cards', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(`
        <div class="ProductCards__item">
          <div class="ProductCard js-product-cart" data-id="21626">
            <span class="js-datalayer-catalog-list-category hidden">Мясо, птица//Фарш</span>
            <a class="js-datalayer-catalog-list-name js-product-detail-link"
              href="/goods/farsh-iz-tsyplenka-broylera-premium-21626/">
              <span class="js-product-v-tizer__title-text">Фарш из&nbsp;цыпленка &quot;Премиум&quot;</span>
            </a>
            <img class="ProductCard__imageImg" src="https://img.vkusvill.ru/product.jpg" alt="Фарш" />
            <span class="Price__value">319&nbsp;руб</span>
          </div>
        </div>
      `),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const adapter = new PageStoreAdapter();

    const response = await adapter.searchVkusvill('фарш');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://vkusvill.ru/search/?q=%D1%84%D0%B0%D1%80%D1%88&type=products',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'text/html,application/xhtml+xml',
        }),
      }),
    );
    expect(response).toEqual({
      provider: 'vkusvill',
      query: 'фарш',
      searchUrl: 'https://vkusvill.ru/search/?q=%D1%84%D0%B0%D1%80%D1%88&type=products',
      warnings: [],
      products: [
        {
          id: 'vkusvill:21626',
          provider: 'vkusvill',
          externalId: '21626',
          name: 'Фарш из цыпленка "Премиум"',
          category: 'Мясо, птица / Фарш',
          priceCents: 31900,
          priceText: '319 руб',
          productUrl: 'https://vkusvill.ru/goods/farsh-iz-tsyplenka-broylera-premium-21626/',
          imageUrl: 'https://img.vkusvill.ru/product.jpg',
          available: true,
          source: 'PAGE_PARSE',
        },
      ],
    });
  });

  it('rejects empty page search queries', async () => {
    const adapter = new PageStoreAdapter();

    await expect(adapter.searchVkusvill('   ')).rejects.toThrow('query is required');
  });
});
