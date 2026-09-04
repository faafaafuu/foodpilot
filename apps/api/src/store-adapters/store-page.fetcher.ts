import { BadGatewayException } from '@nestjs/common';

const ATTEMPTS = 3;
/** Сколько ждём одну попытку. */
const ATTEMPT_TIMEOUT_MS = 6000;
/** Сколько всего готовы потратить на один магазин. */
const BUDGET_MS = 12000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; FoodPilot/0.1; +https://github.com/faafaafuu/foodpilot)';

/**
 * Читает страницу магазина, повторяя попытку при обрыве связи.
 *
 * Повторы здесь не перестраховка. У человека за VPN связь с магазином рвётся
 * через раз: замеры на живой машине дали одно успешное соединение из трёх,
 * причём неудачное даже не устанавливалось — не «медленно», а «никак». Без
 * повторов поиск проваливался бы чаще, чем работал, и человек считал бы
 * сломанной программу, а не сеть.
 *
 * Повторяется только чтение страницы поиска: запрос идемпотентный, ничего не
 * меняет, и лишний поход стоит секунды. Ответ магазина об ошибке не
 * повторяется — если он сказал «нет», второй раз он скажет то же.
 *
 * У повторов есть общий предел по времени. Магазины опрашиваются разом, и
 * ответ приходит по самому медленному из них: без предела один недостижимый
 * магазин добавлял бы полминуты ожидания к каждому товару в списке, то есть
 * платили бы за него все остальные.
 *
 * Загрузчик общий на все магазины: сеть у них одна, и разное поведение при
 * обрыве означало бы, что один магазин молча пропадает из сравнения, а другой
 * нет.
 */
export async function fetchStorePage(url: URL): Promise<string> {
  const deadline = Date.now() + BUDGET_MS;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, deadline - Date.now())),
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.7',
          'User-Agent': USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new BadGatewayException(
          `Store page request failed: ${response.status} ${response.statusText}`,
        );
      }

      return await response.text();
    } catch (error) {
      // Отказ самого магазина повторять незачем — он ответил осознанно.
      if (error instanceof BadGatewayException) {
        throw error;
      }
      lastError = error;

      if (attempt < ATTEMPTS && Date.now() + 700 * attempt < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
      } else {
        break;
      }
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new BadGatewayException(`Не удалось достучаться до страницы магазина: ${reason}`);
}
