import { BadRequestException, Injectable } from '@nestjs/common';
import { fetchStorePage } from './store-page.fetcher';
import { ParsedStoreProductResponse, ParsedStoreSearchResponse } from './store-adapter.types';

const VKUSVILL_ORIGIN = 'https://vkusvill.ru';
const MAX_PRODUCTS = 12;

@Injectable()
export class PageStoreAdapter {
  async searchVkusvill(query: string): Promise<ParsedStoreSearchResponse> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new BadRequestException('query is required for page store search.');
    }

    const searchUrl = new URL('/search/', VKUSVILL_ORIGIN);
    searchUrl.searchParams.set('q', cleanQuery);
    searchUrl.searchParams.set('type', 'products');
    const html = await fetchStorePage(searchUrl);
    const products = parseVkusvillProducts(html);
    const warnings: string[] = [];

    if (products.length === 0) {
      warnings.push('No products were parsed from the public VkusVill search page.');
    }

    return {
      provider: 'vkusvill',
      query: cleanQuery,
      searchUrl: searchUrl.toString(),
      products,
      warnings,
    };
  }
}

function parseVkusvillProducts(html: string): ParsedStoreProductResponse[] {
  return productCardFragments(html)
    .map(parseVkusvillProduct)
    .filter((product): product is ParsedStoreProductResponse => Boolean(product))
    .slice(0, MAX_PRODUCTS);
}

function productCardFragments(html: string): string[] {
  return html
    .split('<div class="ProductCards__item')
    .slice(1)
    .map((fragment) => `<div class="ProductCards__item${fragment}`);
}

function parseVkusvillProduct(fragment: string): ParsedStoreProductResponse | null {
  const externalId = firstMatch(fragment, /data-id="([^"]+)"/);
  const href = firstMatch(fragment, /class="[^"]*js-product-detail-link[^"]*"[^>]*href="([^"]+)"/);
  const name =
    firstMatch(fragment, /class="js-product-v-tizer__title-text"[^>]*>([\s\S]*?)<\/span>/) ??
    firstMatch(fragment, /class="ProductCard__imageImg"[^>]*alt="([^"]+)"/);

  if (!externalId || !href || !name) {
    return null;
  }

  const category = firstMatch(
    fragment,
    /class="js-datalayer-catalog-list-category hidden">([\s\S]*?)<\/span>/,
  );
  const imageUrl = firstMatch(fragment, /class="ProductCard__imageImg"[^>]*src="([^"]+)"/);
  const dataLayerPrice = firstMatch(
    fragment,
    /class="js-datalayer-catalog-list-price hidden">([\s\S]*?)<\/span>/,
  );
  const priceText =
    dataLayerPrice ??
    firstMatch(fragment, /class="Price__value"[^>]*>([\s\S]*?)<\/span>/) ??
    firstMatch(fragment, /class="Price[^"]*"[^>]*>([\s\S]{0,160}?руб[\s\S]{0,20}?)<\/span>/);
  const cleanPriceText = priceText ? normalizePriceText(priceText) : null;
  const productUrl = new URL(decodeHtmlEntities(href), VKUSVILL_ORIGIN).toString();

  return {
    id: `vkusvill:${externalId}`,
    provider: 'vkusvill',
    externalId,
    name: cleanText(name),
    category: category ? cleanText(category).replace(/\s*\/\/\s*/g, ' / ') : null,
    priceCents: cleanPriceText ? priceTextToCents(cleanPriceText) : null,
    priceText: cleanPriceText,
    productUrl,
    imageUrl: imageUrl ? decodeHtmlEntities(imageUrl) : null,
    available: !fragment.includes('_restDisabled'),
    source: 'PAGE_PARSE',
  };
}

function firstMatch(input: string, pattern: RegExp): string | null {
  const match = input.match(pattern);

  return match?.[1] ?? null;
}

function cleanText(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(input: string): string {
  const entities: Record<string, string> = {
    amp: '&',
    hellip: '...',
    laquo: '«',
    nbsp: ' ',
    quot: '"',
    raquo: '»',
  };

  return input
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => entities[name] ?? entity);
}

function priceTextToCents(priceText: string): number | null {
  const normalized = priceText.replace(/\s+/g, '').replace(',', '.');
  const match = normalized.match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    return null;
  }

  return Math.round(Number(match[1]) * 100);
}

function normalizePriceText(priceText: string): string {
  const cleanPrice = cleanText(priceText);

  return /руб/i.test(cleanPrice) ? cleanPrice : `${cleanPrice} руб`;
}
