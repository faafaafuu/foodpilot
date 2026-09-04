import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';

const VKUSVILL_ORIGIN = 'https://vkusvill.ru';

/** Сколько ждать, пока страница оформления соберётся. */
const STEP_TIMEOUT_MS = 20_000;

export interface CheckoutPlan {
  /** Что видно на странице оформления: заголовки, суммы, выбранное. */
  summary: string[];
  /** Кнопки, найденные на шаге оформления, с их подписями. */
  buttons: CheckoutControl[];
  /** Способы оплаты, которые предлагает магазин. */
  paymentOptions: CheckoutControl[];
  /** Итог к оплате в рублях. `null` — прочитать не удалось. */
  totalRub: number | null;
  /** Кнопка, которая оформляет заказ. `null` — не нашлась. */
  confirmButton: CheckoutControl | null;
  /** Чего не хватает, чтобы оформить. Пусто — всё на месте. */
  blockers: string[];
}

export interface CheckoutControl {
  /** Подпись, как её видит человек. */
  label: string;
  /** Селектор, по которому этот элемент можно нажать. */
  selector: string;
  visible: boolean;
  enabled: boolean;
}

export interface CheckoutConfirmation {
  placed: boolean;
  /** Сумма, на которую оформлено. */
  totalRub: number | null;
  message: string;
}

/**
 * Оформление заказа в ВкусВилле.
 *
 * Разбито на два шага намеренно, и это не осторожность ради осторожности.
 *
 * Оформляющее нажатие необратимо и тратит настоящие деньги. Проверить его
 * заранее нельзя ни разу: страница оформления показывается только вошедшему
 * человеку с непустой корзиной, сохранённым адресом и картой, а единственный
 * способ «проверить» нажатие — нажать, то есть купить продукты. Селекторы для
 * него написаны по устройству остальной вёрстки магазина и до первого запуска
 * остаются предположением.
 *
 * Поэтому `plan` доходит до последнего шага и останавливается, рассказывая всё,
 * что увидел: какие кнопки есть, какие способы оплаты предложены, какая сумма.
 * Его можно запускать сколько угодно раз — он ничего не покупает. А `confirm`
 * нажимает, но только когда сумма совпала с той, что человек уже видел: расход
 * селекторов не должен превращаться в заказ не того и не на ту сумму.
 *
 * Оплата при этом остаётся магазинной: карта или СБП лежат в аккаунте
 * ВкусВилла, и никаких платёжных данных здесь не появляется и не хранится.
 */
@Injectable()
export class VkusvillCheckoutService {
  private readonly logger = new Logger(VkusvillCheckoutService.name);

  /**
   * Доходит до последнего шага оформления и останавливается.
   *
   * Ничего не покупает: смысл в том, чтобы превратить неизвестную страницу в
   * данные, по которым видно, готов ли заказ и что именно будет нажато.
   */
  async plan(page: Page): Promise<CheckoutPlan> {
    const blockers: string[] = [];

    await page.goto(`${VKUSVILL_ORIGIN}/cart/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);

    if (await this.looksLoggedOut(page)) {
      blockers.push('в магазин не выполнен вход — оформлять нечем');
    }

    // Переход к оформлению. Подпись у кнопки меняется от акции к акции, поэтому
    // ищем по смыслу текста, а не по классу.
    const toCheckout = page
      .getByRole('link', { name: /оформ|заказ|далее/i })
      .or(page.getByRole('button', { name: /оформ|заказ|далее/i }))
      .first();

    if (await toCheckout.isVisible().catch(() => false)) {
      await toCheckout.click().catch(() => undefined);
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await page.waitForTimeout(3_000);
    } else {
      blockers.push('кнопка перехода к оформлению не найдена — возможно, корзина пуста');
    }

    const buttons = await this.collectControls(page, 'button, a[role="button"], [class*="Button"]');
    const paymentOptions = await this.collectControls(
      page,
      '[class*="payment" i] label, [class*="Payment"] label, input[type="radio"] + label',
    );
    const summary = await this.collectSummary(page);
    const totalRub = firstNumber(summary.join(' '));

    const confirmButton =
      buttons.find((control) => /оплатит|оформить заказ|подтвердить/i.test(control.label)) ?? null;

    if (!confirmButton) {
      blockers.push('кнопка оформления на странице не найдена');
    } else if (!confirmButton.enabled) {
      blockers.push(`кнопка «${confirmButton.label}» неактивна — магазин чего-то ждёт`);
    }
    if (totalRub === null) {
      blockers.push('сумму к оплате прочитать не удалось');
    }
    if (paymentOptions.length === 0) {
      blockers.push('способы оплаты на странице не видны — проверьте, привязана ли карта');
    }

    return { summary, buttons, paymentOptions, totalRub, confirmButton, blockers };
  }

  /**
   * Нажимает кнопку оформления.
   *
   * `expectedTotalRub` — сумма, которую человек уже видел и одобрил. Несовпадение
   * означает, что корзина или страница изменились между показом и нажатием, и
   * оформлять её нельзя: это был бы заказ не на ту сумму, о которой договорились.
   */
  async confirm(page: Page, expectedTotalRub: number): Promise<CheckoutConfirmation> {
    const plan = await this.plan(page);

    if (plan.blockers.length > 0) {
      throw new BadRequestException(`Оформить нельзя: ${plan.blockers.join('; ')}`);
    }
    if (plan.totalRub !== expectedTotalRub) {
      throw new BadRequestException(
        `Сумма изменилась: договаривались о ${expectedTotalRub}, на странице ${plan.totalRub}. ` +
          'Заказ не оформлен.',
      );
    }

    const button = page.locator(plan.confirmButton!.selector).first();
    await button.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
    await button.click();
    await page.waitForTimeout(5_000);

    // Успех признаём по тому, что магазин увёл со страницы оформления. Сам по
    // себе клик ничего не доказывает — ровно как и при складывании в корзину.
    const url = page.url();
    const placed = /order|thank|success|spasibo/i.test(url);

    this.logger.log(`vkusvill: оформление ${placed ? 'прошло' : 'не подтвердилось'}, ${url}`);

    return {
      placed,
      totalRub: plan.totalRub,
      message: placed
        ? `Заказ оформлен на ${plan.totalRub} рублей.`
        : `Нажатие прошло, но подтверждения магазина не видно. Проверьте заказ на ${url}`,
    };
  }

  private async looksLoggedOut(page: Page): Promise<boolean> {
    const loginLink = page.getByRole('link', { name: /войти|вход/i }).first();

    return loginLink.isVisible().catch(() => false);
  }

  private async collectControls(page: Page, selector: string): Promise<CheckoutControl[]> {
    const nodes = page.locator(selector);
    const count = Math.min(await nodes.count().catch(() => 0), 40);
    const controls: CheckoutControl[] = [];

    for (let at = 0; at < count; at += 1) {
      const node = nodes.nth(at);
      const label = ((await node.innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();

      if (!label || label.length > 80) {
        continue;
      }
      controls.push({
        label,
        selector: `${selector} >> nth=${at}`,
        visible: await node.isVisible().catch(() => false),
        enabled: await node.isEnabled().catch(() => false),
      });
    }
    return controls;
  }

  private async collectSummary(page: Page): Promise<string[]> {
    const nodes = page.locator('[class*="Total" i], [class*="Summary" i], [class*="Order" i]');
    const count = Math.min(await nodes.count().catch(() => 0), 20);
    const lines: string[] = [];

    for (let at = 0; at < count; at += 1) {
      const text = ((await nodes.nth(at).innerText().catch(() => '')) ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text && text.length <= 200 && !lines.includes(text)) {
        lines.push(text);
      }
    }
    return lines;
  }
}

/** Первое число в строке как рубли. */
function firstNumber(text: string): number | null {
  const match = text.replace(/ /g, ' ').match(/(\d[\d\s]{2,})\s*(?:₽|руб)/i);

  if (!match) {
    return null;
  }
  return Number(match[1].replace(/\s/g, ''));
}
