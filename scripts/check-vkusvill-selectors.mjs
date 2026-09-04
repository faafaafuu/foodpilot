// Проверка селекторов ВкусВилла на живой странице.
//
// Селекторы автоматизации ломаются молча: магазин меняет вёрстку, кнопка
// переезжает, и корзина просто перестаёт наполняться — без ошибки, без следа.
// Этот скрипт открывает настоящую карточку товара настоящим браузером и
// говорит, на месте ли то, на что опирается `vkusvill-cart.service.ts`.
//
// Вход в магазин не нужен и намеренно не делается: проверяется наличие
// разметки, а не покупка. Ничего не кладётся в корзину и не оформляется.
//
//     node scripts/check-vkusvill-selectors.mjs [адрес карточки]

import { chromium } from 'playwright';

const PRODUCT_URL = process.argv[2] ?? 'https://vkusvill.ru/goods/moloko-2-36296/';

/** То же, на что опирается служба корзины. Расходиться им нельзя. */
const SELECTORS = [
  { name: 'кнопка «в корзину»', selector: 'button.CartButton__content--add', required: true },
  { name: 'ссылка на корзину', selector: 'a[href="/cart/"]', required: true },
  { name: 'название товара', selector: 'h1', required: true },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  locale: 'ru-RU',
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 FoodPilot/0.1',
});

let broken = 0;
try {
  await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  // Странице надо дать дорисоваться: кнопка приходит скриптом.
  await page.waitForTimeout(3_000);

  console.log(`страница: ${PRODUCT_URL}`);
  console.log(`заголовок: ${(await page.title()).slice(0, 70)}\n`);

  for (const { name, selector, required } of SELECTORS) {
    const count = await page.locator(selector).count();
    const visible = count > 0 ? await page.locator(selector).first().isVisible() : false;
    const ok = count > 0 && visible;

    if (!ok && required) {
      broken += 1;
    }
    console.log(
      `${ok ? '  есть  ' : '  НЕТ   '} ${name.padEnd(22)} ${selector.padEnd(38)} найдено: ${count}`,
    );
  }

  const title = await page.locator('h1').first().innerText().catch(() => '');
  console.log(`\nтовар на странице: ${title.replace(/\s+/g, ' ').trim().slice(0, 60)}`);
} finally {
  await browser.close();
}

if (broken > 0) {
  console.error(`\nразметка магазина разошлась с ожидаемой: ${broken} из ${SELECTORS.length}`);
  process.exit(1);
}
console.log('\nвсе селекторы на месте');
