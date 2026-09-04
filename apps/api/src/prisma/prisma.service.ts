import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Клиент базы данных.
 *
 * Отсутствие базы не мешает приложению подняться, и это не небрежность.
 * Половина ручек к базе не обращается вовсе: поиск по странице магазина,
 * складывание в корзину и оформление заказа работают браузером и сетью. Раньше
 * любая из них была недоступна, если рядом не поднят Postgres, — приложение
 * падало на старте целиком, ещё до того, как выяснится, нужна ли база тому,
 * кто пришёл.
 *
 * Поэтому неудачное подключение только записывается в журнал, громко и с
 * причиной. Ручки, которым база нужна, всё равно откажут — но своей ошибкой и
 * по делу, а не отказом всего приложения запуститься.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /** Удалось ли подключиться. По этому видно, чего ждать от ручек с базой. */
  private connected = false;

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.connected = true;
    } catch (error) {
      const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);

      this.logger.warn(
        `База данных недоступна (${reason}). Приложение работает без неё: ручки, ` +
          'которым нужна база, будут отвечать ошибкой, остальные — как обычно.',
      );
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.$disconnect();
    }
  }
}
