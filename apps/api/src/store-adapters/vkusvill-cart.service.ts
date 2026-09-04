import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';

const VKUSVILL_ORIGIN = 'https://vkusvill.ru';

/**
 * Кнопка «в корзину» на карточке товара.
 *
 * Взято с живой страницы, а не придумано: `CartButton__content--add` — это
 * класс самой кнопки, а `js-user-load-login-api` рядом с ней означает, что
 * без входа нажатие уводит на логин. Отсюда и требование к сессии: профиль
 * браузера должен быть тот, в котором человек уже вошёл.
 */
const ADD_BUTTON = 'button.CartButton__content--add';

/**
 * Во что превращается кнопка после добавления.
 *
 * ВкусВилл подменяет «в корзину» счётчиком количества. Это единственный
 * честный признак, что товар действительно лёг в корзину: сам по себе клик
 * ничего не доказывает — он мог уйти в пустоту, в логин или в модальное окно.
 */
const ADDED_MARKER = '.CartButton__content--count, .CartButton__counter, [class*="CartButton__count"]';

/** Сколько ждать реакции страницы на клик. */
const CLICK_TIMEOUT_MS = 15_000;

export interface VkusvillCartRequestItem {
  /** Адрес карточки товара — его отдаёт поиск в поле `productUrl`. */
  productUrl: string;
  /** Сколько штук. Кнопка кладёт одну, поэтому остальное дожимается счётчиком. */
  quantity?: number;
}

export interface VkusvillCartItemResult {
  productUrl: string;
  requested: number;
  added: number;
  ok: boolean;
  /** Почему не вышло. `null` — вышло. */
  problem: string | null;
}

export interface VkusvillCartResult {
  items: VkusvillCartItemResult[];
  /** Что показывает сама корзина после добавления. */
  cart: VkusvillCartSnapshot;
}

export interface VkusvillCartSnapshot {
  /** Строки корзины, как их видно на странице. */
  lines: string[];
  /** Итог в рублях. `null` — на странице его прочитать не удалось. */
  totalRub: number | null;
  /** О чём стоит знать: непрочитанный итог, пустая корзина и прочее. */
  warnings: string[];
}

/**
 * Складывает товары в корзину ВкусВилла в уже открытом браузере.
 *
 * Почему браузером, а не запросом к API. Корзина ВкусВилла живёт за входом и
 * рисуется скриптом: в исходном HTML страницы `/cart/` товаров нет вовсе, там
 * только заготовки модальных окон. Разбирать нечего — читать надо то, что
 * получилось на экране.
 *
 * Оплаты здесь нет намеренно. Складывание в корзину проверяемо и обратимо:
 * ошибся селектор — человек увидит не тот товар и уберёт его. Оформление
 * заказа необратимо и тратит деньги, поэтому его нельзя строить поверх
 * непроверенной автоматики — сначала должно накопиться доверие к этой части.
 */
@Injectable()
export class VkusvillCartService {
  private readonly logger = new Logger(VkusvillCartService.name);

  async addItems(page: Page, items: VkusvillCartRequestItem[]): Promise<VkusvillCartResult> {
    const results: VkusvillCartItemResult[] = [];

    for (const item of items) {
      results.push(await this.addOne(page, item));
    }

    return { items: results, cart: await this.readCart(page) };
  }

  private async addOne(page: Page, item: VkusvillCartRequestItem): Promise<VkusvillCartItemResult> {
    const requested = Math.max(1, Math.floor(item.quantity ?? 1));
    const result: VkusvillCartItemResult = {
      productUrl: item.productUrl,
      requested,
      added: 0,
      ok: false,
      problem: null,
    };

    try {
      await page.goto(absolute(item.productUrl), { waitUntil: 'domcontentloaded' });
    } catch (error) {
      result.problem = `страница товара не открылась: ${describe(error)}`;
      return result;
    }

    const addButton = page.locator(ADD_BUTTON).first();
    try {
      await addButton.waitFor({ state: 'visible', timeout: CLICK_TIMEOUT_MS });
    } catch {
      // Кнопки нет — товара нет в продаже, либо разметка магазина изменилась.
      // Различить это отсюда нельзя, и выдумывать причину не стоит.
      result.problem = 'кнопки «в корзину» на странице не нашлось';
      return result;
    }

    await addButton.click();

    // Клик сам по себе ничего не доказывает: он мог уйти в логин или в
    // модальное окно. Признаём добавление только по появившемуся счётчику.
    try {
      await page.locator(ADDED_MARKER).first().waitFor({
        state: 'visible',
        timeout: CLICK_TIMEOUT_MS,
      });
    } catch {
      result.problem = 'после нажатия счётчик не появился — похоже, нужен вход в магазин';
      return result;
    }

    result.added = 1;
    result.ok = true;

    // Больше одной штуки набирается тем же счётчиком. Если плюс не нашёлся,
    // это не провал: одна штука уже лежит, и об этом сказано в `added`.
    if (requested > 1) {
      result.added = await this.raiseQuantity(page, requested);
    }

    this.logger.log(`vkusvill: добавлено ${result.added}/${requested} — ${item.productUrl}`);
    return result;
  }

  /** Дожимает количество плюсом на карточке. Возвращает, сколько получилось. */
  private async raiseQuantity(page: Page, requested: number): Promise<number> {
    const plus = page
      .locator('[class*="CartButton"] [class*="plus"], [class*="Counter"] [class*="plus"]')
      .first();

    let added = 1;
    for (let step = 1; step < requested; step += 1) {
      try {
        await plus.click({ timeout: 3_000 });
        added += 1;
      } catch {
        break;
      }
    }
    return added;
  }

  /** Читает корзину так, как её видит человек. */
  async readCart(page: Page): Promise<VkusvillCartSnapshot> {
    const warnings: string[] = [];

    try {
      await page.goto(`${VKUSVILL_ORIGIN}/cart/`, { waitUntil: 'domcontentloaded' });
    } catch (error) {
      return { lines: [], totalRub: null, warnings: [`корзина не открылась: ${describe(error)}`] };
    }

    // Странице надо дать дорисоваться: товары приходят скриптом, и сразу после
    // загрузки их ещё нет.
    await page.waitForTimeout(2_000);

    const lines = await this.readLines(page);
    if (lines.length === 0) {
      warnings.push('в корзине ничего не видно — она пуста либо разметка магазина изменилась');
    }

    const totalRub = await this.readTotal(page);
    if (totalRub === null) {
      warnings.push('итог со страницы прочитать не удалось');
    }

    return { lines, totalRub, warnings };
  }

  private async readLines(page: Page): Promise<string[]> {
    const rows = page.locator('[class*="CartItem"], [class*="BasketItem"]');
    const count = Math.min(await rows.count(), 60);
    const lines: string[] = [];

    for (let at = 0; at < count; at += 1) {
      const text = ((await rows.nth(at).innerText().catch(() => '')) ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) {
        lines.push(text);
      }
    }
    return lines;
  }

  /**
   * Итог корзины.
   *
   * Разметку итога проверить заранее нельзя: пустая корзина её не показывает,
   * а непустая бывает только у вошедшего человека. Поэтому берётся не один
   * селектор, а несколько вероятных, и если ни один не дал числа — об этом
   * честно сообщается предупреждением, а не подставляется ноль.
   */
  private async readTotal(page: Page): Promise<number | null> {
    const candidates = [
      '[class*="CartTotal"]',
      '[class*="Total__value"]',
      '[class*="Summary"] [class*="price"]',
      '[class*="Cart"] [class*="Price"]',
    ];

    for (const selector of candidates) {
      const text = await page
        .locator(selector)
        .first()
        .innerText()
        .catch(() => '');
      const rub = parseRubles(text ?? '');
      if (rub !== null) {
        return rub;
      }
    }
    return null;
  }
}

function absolute(url: string): string {
  return new URL(url, VKUSVILL_ORIGIN).toString();
}

/** Первое число в строке как рубли: «1 234 ₽» и «1234,50 руб». */
function parseRubles(text: string): number | null {
  const normalized = text.replace(/ /g, ' ').replace(/\s/g, '');
  const match = normalized.match(/(\d+(?:[.,]\d+)?)/);

  if (!match) {
    return null;
  }
  return Math.round(Number(match[1].replace(',', '.')));
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
