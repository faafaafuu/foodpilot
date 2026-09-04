import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MagnitAdapter } from './magnit.adapter';
import { MetroAdapter } from './metro.adapter';
import { PageStoreAdapter } from './page-store.adapter';
import { ParsedStoreSearchResponse } from './store-adapter.types';

/**
 * Сколько не тревожим магазин после отказа.
 *
 * Список покупок — это несколько поисков подряд, и лежачий магазин отвечал бы
 * отказом на каждый, каждый раз выбирая весь предел ожидания. За минуту он не
 * успеет починиться, зато человек не будет платить за него временем на каждой
 * позиции списка.
 */
const COOLDOWN_MS = 60_000;

/** Что ответил один магазин. */
export interface StoreSearchOutcome extends ParsedStoreSearchResponse {
  /**
   * Дошёл ли запрос до магазина.
   *
   * Пустая полка и молчащий магазин выглядят одинаково — ни одного товара, —
   * но означают разное: в первом случае надо просить другое, во втором
   * попробовать позже. Без этого признака тому, кто спрашивает, пришлось бы
   * гадать по тексту предупреждений.
   */
  reachable: boolean;
}

export interface MultiStoreSearchResponse {
  query: string;
  stores: StoreSearchOutcome[];
}

/**
 * Ищет товар сразу во всех разобранных магазинах.
 *
 * Один магазин — это одна цена и один ассортимент, и по ним не видно, дорого
 * это или дёшево. Сравнение имеет смысл только при нескольких полках рядом,
 * поэтому поиск идёт во все магазины и отдаёт их ответы порознь, не сливая в
 * общий список: заказ собирается в одном магазине, и решать, в каком именно,
 * должен тот, кто знает про доставку и корзину.
 *
 * Магазины опрашиваются разом. Последовательный обход стоил бы суммы их
 * задержек на каждый товар, и на списке из пяти позиций человек ждал бы
 * дольше, чем готов.
 */
@Injectable()
export class StoreSearchService {
  private readonly logger = new Logger(StoreSearchService.name);
  /** Магазины, которые только что отказали, и до какого времени их не трогаем. */
  private readonly resting = new Map<string, { until: number; reason: string }>();

  constructor(
    private readonly vkusvillAdapter: PageStoreAdapter,
    private readonly magnitAdapter: MagnitAdapter,
    private readonly metroAdapter: MetroAdapter,
  ) {}

  async searchEverywhere(query: string): Promise<MultiStoreSearchResponse> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      throw new BadRequestException('query is required for store search.');
    }

    const searches: [string, () => Promise<ParsedStoreSearchResponse>][] = [
      ['vkusvill', () => this.vkusvillAdapter.searchVkusvill(cleanQuery)],
      ['magnit', () => this.magnitAdapter.search(cleanQuery)],
      ['metro', () => this.metroAdapter.search(cleanQuery)],
    ];

    const stores = await Promise.all(
      searches.map(([provider, run]) => this.attempt(provider, cleanQuery, run)),
    );

    return { query: cleanQuery, stores };
  }

  /**
   * Спрашивает один магазин, не давая его отказу сорвать остальные.
   *
   * Магазины падают поодиночке: один за VPN недостижим, второй отвечает за
   * секунду. Если бы отказ одного ронял весь ответ, сравнение пропадало бы
   * целиком из-за магазина, который человеку и не нужен.
   */
  private async attempt(
    provider: string,
    query: string,
    run: () => Promise<ParsedStoreSearchResponse>,
  ): Promise<StoreSearchOutcome> {
    const rest = this.resting.get(provider);
    if (rest && Date.now() < rest.until) {
      return this.unreachable(provider, query, rest.reason);
    }

    try {
      const found = await run();
      this.resting.delete(provider);

      return { ...found, reachable: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Магазин ${provider} не ответил на «${query}»: ${reason}`);
      this.resting.set(provider, { until: Date.now() + COOLDOWN_MS, reason });

      return this.unreachable(provider, query, reason);
    }
  }

  private unreachable(provider: string, query: string, reason: string): StoreSearchOutcome {
    return {
      provider,
      query,
      searchUrl: '',
      products: [],
      warnings: [reason],
      reachable: false,
    };
  }
}
