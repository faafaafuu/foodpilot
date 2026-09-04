import { BadRequestException, Injectable } from '@nestjs/common';
import { runInNewContext } from 'node:vm';
import { fetchStorePage } from './store-page.fetcher';
import { ParsedStoreProductResponse, ParsedStoreSearchResponse } from './store-adapter.types';

const ORIGIN = 'https://online.metro-cc.ru';
const MAX_PRODUCTS = 12;
const PAYLOAD_TIMEOUT_MS = 5000;

/**
 * Поиск по Метро.
 *
 * Как и Магнит, страница везёт товары готовыми данными для клиента, но кладёт
 * их не отдельным JSON, а присваиванием `window.__NUXT__` — самовызывающейся
 * функцией, где повторяющиеся строки вынесены в параметры. Прочитать её
 * разбором текста нельзя: у объекта на странице нет цельного вида, он
 * собирается только при выполнении.
 */
@Injectable()
export class MetroAdapter {
  async search(query: string): Promise<ParsedStoreSearchResponse> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new BadRequestException('query is required for Metro search.');
    }

    const searchUrl = new URL('/search', ORIGIN);
    searchUrl.searchParams.set('q', cleanQuery);

    const html = await fetchStorePage(searchUrl);
    const products = parseProducts(html);
    const warnings: string[] = [];

    if (products.length === 0) {
      warnings.push('На странице поиска Метро не удалось разобрать ни одного товара.');
    }

    return {
      provider: 'metro',
      query: cleanQuery,
      searchUrl: searchUrl.toString(),
      products,
      warnings,
    };
  }
}

/**
 * Выполняет присваивание со страницы и достаёт из результата полку.
 *
 * Выполнение чужого кода здесь осознанное и ограниченное: выражение считается
 * в отдельном контексте без единой глобальной переменной — ни `process`, ни
 * `require`, ни `fetch` внутри не видно, — и с жёстким пределом по времени,
 * чтобы страница не могла подвесить сервер бесконечным циклом. Контекст `vm`
 * не считается защитой от намеренного побега, поэтому так читается только
 * страница поиска магазина и ничего больше; всё остальное разбирается без
 * выполнения.
 */
function parseProducts(html: string): ParsedStoreProductResponse[] {
  const payload = html.match(/window\.__NUXT__=([\s\S]*?);?<\/script>/);
  if (!payload) {
    return [];
  }

  let state: unknown;
  try {
    state = runInNewContext(`(${payload[1]})`, Object.create(null) as object, {
      timeout: PAYLOAD_TIMEOUT_MS,
    });
  } catch {
    return [];
  }

  return shelfOf(state).slice(0, MAX_PRODUCTS).map(toProduct).filter(isProduct);
}

/**
 * Находит полку в нагрузке.
 *
 * Ключ, под которым лежит ответ поиска, содержит хеш собранного компонента и
 * меняется при каждой сборке магазина. Поэтому полка ищется по своему виду, а
 * не по имени ключа: иначе адаптер ломался бы от чужого релиза.
 */
function shelfOf(state: unknown): Record<string, unknown>[] {
  const fetched = (state as { fetch?: Record<string, unknown> } | null)?.fetch;
  if (!fetched || typeof fetched !== 'object') {
    return [];
  }

  for (const chunk of Object.values(fetched)) {
    const products = (chunk as { productsData?: { products?: unknown } } | null)?.productsData
      ?.products;

    if (Array.isArray(products)) {
      return products as Record<string, unknown>[];
    }
  }

  return [];
}

function toProduct(raw: Record<string, unknown>): ParsedStoreProductResponse | null {
  const name = raw.name;
  const url = raw.url;

  if (typeof name !== 'string' || typeof url !== 'string' || !name || !url) {
    return null;
  }

  const stock = Array.isArray(raw.stocks)
    ? (raw.stocks[0] as Record<string, unknown> | undefined)
    : undefined;
  const prices = stock?.prices as Record<string, unknown> | undefined;
  // Цена доставки, а не зала: у Метро это разные числа, и платит человек за
  // первое. Цена зала лежит рядом, в `offline`, и здесь не нужна.
  const price = typeof prices?.price === 'number' ? prices.price : null;
  const images = Array.isArray(raw.images) ? raw.images : [];

  return {
    id: `metro:${String(raw.id ?? url)}`,
    provider: 'metro',
    externalId: String(raw.id ?? url),
    name,
    category: categoryOf(raw),
    priceCents: price === null ? null : Math.round(price * 100),
    priceText: price === null ? null : `${price} руб`,
    productUrl: new URL(url, ORIGIN).toString(),
    imageUrl: typeof images[0] === 'string' ? images[0] : null,
    available: stock?.eshop_availability === true,
    source: 'PAGE_PARSE',
  };
}

function categoryOf(raw: Record<string, unknown>): string | null {
  const name = (raw.category as { name?: unknown } | null)?.name;

  return typeof name === 'string' ? name : null;
}

function isProduct(
  product: ParsedStoreProductResponse | null,
): product is ParsedStoreProductResponse {
  return product !== null;
}
