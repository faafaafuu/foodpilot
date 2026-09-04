import { BadRequestException, Injectable } from '@nestjs/common';
import { fetchStorePage } from './store-page.fetcher';
import { ParsedStoreProductResponse, ParsedStoreSearchResponse } from './store-adapter.types';

const ORIGIN = 'https://magnit.ru';
const MAX_PRODUCTS = 12;

/**
 * Поиск по Магниту.
 *
 * Товары берутся не из разметки, а из данных, которые страница везёт с собой
 * для оживления на клиенте: Nuxt кладёт их в `__NUXT_DATA__` готовым JSON.
 * Это надёжнее разбора HTML — вёрстка магазина меняется от релиза к релизу, а
 * поля товара меняются вместе с его API, то есть куда реже.
 */
@Injectable()
export class MagnitAdapter {
  async search(query: string): Promise<ParsedStoreSearchResponse> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new BadRequestException('query is required for Magnit search.');
    }

    const searchUrl = new URL('/search/', ORIGIN);
    searchUrl.searchParams.set('term', cleanQuery);

    const html = await fetchStorePage(searchUrl);
    const products = parseProducts(html);
    const warnings: string[] = [];

    if (products.length === 0) {
      warnings.push('На странице поиска Магнита не удалось разобрать ни одного товара.');
    }

    return {
      provider: 'magnit',
      query: cleanQuery,
      searchUrl: searchUrl.toString(),
      products,
      warnings,
    };
  }
}

/**
 * Достаёт товары из полезной нагрузки Nuxt.
 *
 * Нагрузка — плоский массив, где объекты ссылаются на свои значения номерами
 * ячеек: так Nuxt не повторяет одинаковые строки. Полностью разворачивать эту
 * структуру не нужно и рискованно — в ней есть ссылки по кругу. Достаточно
 * пройти массив и взять те объекты, что похожи на карточку товара, подставив
 * значения по номерам на один уровень вглубь.
 */
function parseProducts(html: string): ParsedStoreProductResponse[] {
  const payload = html.match(/id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!payload) {
    return [];
  }

  let cells: unknown[];
  try {
    cells = JSON.parse(payload[1]) as unknown[];
  } catch {
    return [];
  }

  const at = (index: unknown): unknown =>
    typeof index === 'number' && index >= 0 ? cells[index] : undefined;

  const seen = new Set<string>();
  const products: ParsedStoreProductResponse[] = [];

  for (const cell of cells) {
    if (!cell || typeof cell !== 'object' || Array.isArray(cell)) {
      continue;
    }

    const node = cell as Record<string, unknown>;
    const title = at(node.title);
    const link = at(node.link);
    const externalId = at(node.id);

    if (typeof title !== 'string' || typeof link !== 'string' || !title || !link) {
      continue;
    }
    // В нагрузке лежат не только товары: так же устроены баннеры и категории.
    // Товар отличает адрес карточки.
    if (!link.startsWith('/product/') || seen.has(link)) {
      continue;
    }
    seen.add(link);

    const price = at(node.price);
    const priceText = typeof price === 'string' && price ? price : null;
    // Остаток на складе. Ноль значит «есть в поиске, но взять нечего».
    const stock = at(node.quantity);

    products.push({
      id: `magnit:${String(externalId ?? link)}`,
      provider: 'magnit',
      externalId: String(externalId ?? link),
      name: title,
      category: null,
      priceCents: priceText ? rublesToCents(priceText) : null,
      priceText: priceText ? `${priceText} руб` : null,
      productUrl: new URL(link, ORIGIN).toString(),
      imageUrl: typeof at(node.image) === 'string' ? (at(node.image) as string) : null,
      available: typeof stock === 'number' ? stock > 0 : true,
      source: 'PAGE_PARSE',
    });

    if (products.length >= MAX_PRODUCTS) {
      break;
    }
  }

  return products;
}

function rublesToCents(price: string): number | null {
  const parsed = Number(price.replace(',', '.'));

  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}
