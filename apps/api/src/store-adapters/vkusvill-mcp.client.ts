import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ParsedStoreProductResponse, ParsedStoreSearchResponse } from './store-adapter.types';

const MCP_ENDPOINT = 'https://mcp.vkusvill.ru/mcp';
const TIMEOUT_MS = 12000;
const MAX_PRODUCTS = 12;
/** Столько позиций принимает одна ссылка на корзину. */
export const CART_LINK_LIMIT = 20;

/**
 * Официальный MCP-сервер ВкусВилла.
 *
 * ВкусВилл сам отдаёт поиск и корзину для ИИ-помощников: JSON-RPC по HTTP,
 * без ключа и без входа. Это надёжнее разбора страниц сразу по трём причинам.
 * Ответ — готовые поля товара, а не вёрстка, которая меняется от релиза к
 * релизу. Сервер живёт на отдельном адресе и отвечает там, где сама витрина
 * недостижима: из-за VPN до `vkusvill.ru` соединение не устанавливается, а до
 * `mcp.vkusvill.ru` — за секунду. И корзина собирается без браузера: сервер
 * возвращает ссылку, по которой открывается уже набранная корзина, и человеку
 * остаётся выбрать доставку и оплатить.
 *
 * Сессию протокола сервер не заводит: `tools/call` работает без `initialize`,
 * поэтому каждый вызов — один самостоятельный запрос.
 */
@Injectable()
export class VkusvillMcpClient {
  async search(query: string): Promise<ParsedStoreSearchResponse> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new BadRequestException('query is required for VkusVill search.');
    }

    const data = (await this.call('vkusvill_products_search', {
      q: cleanQuery,
      mode: 'short',
    })) as { items?: unknown[] };

    const products = (Array.isArray(data?.items) ? data.items : [])
      .map(toProduct)
      .filter((product): product is ParsedStoreProductResponse => product !== null)
      .slice(0, MAX_PRODUCTS);

    return {
      provider: 'vkusvill',
      query: cleanQuery,
      searchUrl: MCP_ENDPOINT,
      products,
      warnings: products.length ? [] : ['MCP ВкусВилла не нашёл ни одного товара.'],
    };
  }

  /**
   * Ссылка на корзину с этими товарами.
   *
   * Корзина собирается на стороне ВкусВилла и открывается по ссылке уже
   * набранной: вход, адрес доставки и оплата — на сайте, у человека, в его
   * браузере. Ничего не покупается, пока он сам не нажмёт «оформить».
   */
  async cartLink(items: { xmlId: number; quantity: number }[]): Promise<string> {
    if (items.length === 0) {
      throw new BadRequestException('Корзина пуста — ссылку делать не на что.');
    }
    if (items.length > CART_LINK_LIMIT) {
      throw new BadRequestException(`В одну ссылку помещается не больше ${CART_LINK_LIMIT} позиций.`);
    }

    const data = (await this.call('vkusvill_cart_link_create', {
      products: items.map((item) => ({ xml_id: item.xmlId, q: item.quantity })),
    })) as { link?: unknown };

    if (typeof data?.link !== 'string' || !data.link.startsWith('https://vkusvill.ru/')) {
      throw new BadGatewayException('MCP ВкусВилла не вернул ссылку на корзину.');
    }

    return data.link;
  }

  /** Вызывает инструмент и отдаёт поле `data` его ответа. */
  private async call(tool: string, args: Record<string, unknown>): Promise<unknown> {
    let raw: string;
    try {
      const response = await fetch(MCP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Сервер вправе ответить и потоком событий, и простым JSON — берём оба.
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: tool, arguments: args },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new BadGatewayException(`MCP ВкусВилла ответил ${response.status}.`);
      }
      raw = await response.text();
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new BadGatewayException(`MCP ВкусВилла недоступен: ${reason}`);
    }

    const envelope = parseEnvelope(raw) as {
      error?: { message?: string };
      result?: { isError?: boolean; content?: { text?: string }[] };
    };
    if (envelope.error) {
      throw new BadGatewayException(`MCP ВкусВилла: ${envelope.error.message ?? 'ошибка'}`);
    }

    const text = envelope.result?.content?.[0]?.text ?? '';
    let payload: { ok?: boolean; data?: unknown; error?: unknown };
    try {
      payload = JSON.parse(text) as typeof payload;
    } catch {
      throw new BadGatewayException(`MCP ВкусВилла прислал не JSON: ${text.slice(0, 120)}`);
    }

    if (envelope.result?.isError || payload.ok === false) {
      throw new BadGatewayException(`MCP ВкусВилла отказал: ${JSON.stringify(payload.error ?? text).slice(0, 200)}`);
    }

    return payload.data;
  }
}

/** Ответ бывает простым JSON или потоком событий с одной строкой `data:`. */
function parseEnvelope(raw: string): unknown {
  const event = raw.split('\n').find((line) => line.startsWith('data:'));
  try {
    return JSON.parse(event ? event.slice(5) : raw);
  } catch {
    throw new BadGatewayException('MCP ВкусВилла прислал непонятный ответ.');
  }
}

function toProduct(raw: unknown): ParsedStoreProductResponse | null {
  const item = raw as {
    xml_id?: unknown;
    name?: unknown;
    url?: unknown;
    price?: { current?: unknown };
  };

  if (typeof item?.xml_id !== 'number' || typeof item.name !== 'string') {
    return null;
  }

  const price = typeof item.price?.current === 'number' ? item.price.current : null;
  const url = typeof item.url === 'string' ? item.url : '';

  return {
    id: `vkusvill:${item.xml_id}`,
    provider: 'vkusvill',
    // По xml_id товар кладётся в корзину — ссылка строится только из него.
    externalId: String(item.xml_id),
    name: decodeEntities(item.name),
    category: null,
    priceCents: price === null ? null : Math.round(price * 100),
    priceText: price === null ? null : `${price} руб`,
    productUrl: url,
    imageUrl: null,
    // Поиск MCP отдаёт только то, что продаётся: отдельного признака наличия
    // в ответе нет.
    available: true,
    source: 'PAGE_PARSE',
  };
}

/** В названиях приходит `&nbsp;` между числом и единицей: «900&nbsp;мл». */
function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}
