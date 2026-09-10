import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ParsedStoreProductResponse, ParsedStoreSearchResponse } from './store-adapter.types';

const BASE = 'https://api.parse.bot/scraper/aae3e5f6-fa2a-444d-9fb9-c4bbdf7aced1';
const TIMEOUT_MS = 12000;
const MAX_PRODUCTS = 12;

/**
 * Поиск по Пятёрочке через parse.bot.
 *
 * Сама Пятёрочка на запрос программы отвечает 403: и страницы, и API её
 * приложения закрыты защитой от ботов. parse.bot — сторонний сервис, который
 * читает каталог сам и отдаёт его по ключу; своего открытого API у X5 нет.
 * Поэтому здесь только поиск и цены — корзины и оформления через него нет.
 *
 * Ключ принадлежит человеку и приходит с каждым запросом: у FoodPilot своих
 * ключей нет, а бесплатный тариф — двести запросов в месяц, по запросу на
 * товар, — и расходовать его должен тот, чей он.
 *
 * Точного примера ответа в описании сервиса нет, только список полей, поэтому
 * разбор терпим к форме, а поля первого ответа пишутся в журнал: по ним видно,
 * что пришло на самом деле.
 */
@Injectable()
export class PyaterochkaAdapter {
  private readonly logger = new Logger(PyaterochkaAdapter.name);
  private shapeLogged = false;

  async search(query: string, apiKey: string): Promise<ParsedStoreSearchResponse> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new BadRequestException('query is required for Pyaterochka search.');
    }
    if (!apiKey.trim()) {
      throw new BadRequestException('Для Пятёрочки нужен ключ parse.bot.');
    }

    const url = new URL(`${BASE}/get_products`);
    url.searchParams.set('query', cleanQuery);
    url.searchParams.set('limit', String(MAX_PRODUCTS));

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: { 'X-API-Key': apiKey.trim(), Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new BadGatewayException(`parse.bot недоступен: ${reason}`);
    }

    if (response.status === 401 || response.status === 403) {
      throw new BadGatewayException('parse.bot не принял ключ.');
    }
    if (response.status === 429 || response.status === 402) {
      throw new BadGatewayException('Запросы parse.bot на этот период кончились.');
    }
    if (!response.ok) {
      throw new BadGatewayException(`parse.bot ответил ${response.status}.`);
    }

    const payload = (await response.json()) as unknown;
    const items = resultsOf(payload);
    if (!this.shapeLogged && items.length > 0) {
      this.shapeLogged = true;
      this.logger.log(`parse.bot: поля товара — ${JSON.stringify(items[0]).slice(0, 400)}`);
    }

    const products = items
      .map(toProduct)
      .filter((product): product is ParsedStoreProductResponse => product !== null)
      .slice(0, MAX_PRODUCTS);

    return {
      provider: 'pyaterochka',
      query: cleanQuery,
      searchUrl: url.toString(),
      products,
      warnings: products.length ? [] : ['parse.bot не нашёл товаров в Пятёрочке.'],
    };
  }
}

/** Товары из ответа: `results`, а на случай другой обёртки — `data.results` или массив. */
function resultsOf(payload: unknown): unknown[] {
  const value = payload as { results?: unknown; data?: { results?: unknown } } | unknown[];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
}

function toProduct(raw: unknown): ParsedStoreProductResponse | null {
  const item = raw as Record<string, unknown>;
  const name = typeof item?.name === 'string' ? item.name.trim() : '';
  const id = item?.id ?? item?.plu;
  if (!name || (typeof id !== 'string' && typeof id !== 'number')) {
    return null;
  }

  const rubles = rublesOf(item.price ?? item.prices);
  const available = item.is_available !== false && item.stock !== 0;

  return {
    id: `pyaterochka:${id}`,
    provider: 'pyaterochka',
    externalId: String(id),
    name,
    category: null,
    priceCents: rubles === null ? null : Math.round(rubles * 100),
    priceText: rubles === null ? null : `${rubles} руб`,
    productUrl: `https://5ka.ru/product/${id}/`,
    imageUrl: typeof item.image === 'string' ? item.image : null,
    available,
    source: 'PAGE_PARSE',
  };
}

/**
 * Цена в рублях из того, как её прислали.
 *
 * Число, строка «89.99» или объект с обычной и акционной ценой — берётся
 * акционная, если есть. Целое число от десяти тысяч считается копейками: в
 * Пятёрочке нет продуктов по десять тысяч рублей, а в копейках так выглядит
 * почти любой товар.
 */
function rublesOf(value: unknown): number | null {
  if (value && typeof value === 'object') {
    const prices = value as Record<string, unknown>;
    return rublesOf(prices.discount ?? prices.promo ?? prices.regular ?? prices.price ?? null);
  }
  const number = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || number <= 0) {
    return null;
  }
  return Number.isInteger(number) && number >= 10000 ? number / 100 : number;
}
