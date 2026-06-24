import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  BrowserStoreDriver,
  BrowserStoreDriverSession,
  PlaywrightBrowserStoreDriver,
} from './browser-store-driver';
import { StartBrowserStoreSessionDto } from './dto/start-browser-store-session.dto';
import {
  BrowserStoreAutomationProvider,
  BrowserStoreSessionResponse,
  BrowserStoreSessionStatus,
} from './store-adapter.types';

interface BrowserStoreSessionRecord {
  id: string;
  provider: BrowserStoreAutomationProvider;
  displayName: string;
  status: BrowserStoreSessionStatus;
  loginUrl: string;
  profilePath: string;
  headless: boolean;
  createdAt: Date;
  openedAt: Date | null;
  closedAt: Date | null;
  currentUrl: string | null;
  warning: string | null;
  driverSession: BrowserStoreDriverSession | null;
}

const PROVIDERS: Record<BrowserStoreAutomationProvider, { displayName: string; loginUrl: string }> =
  {
    'yandex-eda': {
      displayName: 'Яндекс Еда',
      loginUrl: 'https://eda.yandex.ru/',
    },
    'yandex-go': {
      displayName: 'Яндекс Go',
      loginUrl: 'https://go.yandex/',
    },
    pyaterochka: {
      displayName: 'Пятерочка',
      loginUrl: 'https://5ka.ru/',
    },
    magnit: {
      displayName: 'Магнит',
      loginUrl: 'https://magnit.ru/',
    },
  };

@Injectable()
export class BrowserStoreSessionService {
  private readonly sessions = new Map<string, BrowserStoreSessionRecord>();
  private readonly driver: BrowserStoreDriver;

  constructor(
    @Optional()
    @Inject(PlaywrightBrowserStoreDriver)
    driver?: BrowserStoreDriver,
  ) {
    this.driver = driver ?? new PlaywrightBrowserStoreDriver();
  }

  listSessions(): BrowserStoreSessionResponse[] {
    return [...this.sessions.values()].map((session) => this.toResponse(session));
  }

  getSession(sessionId: string): BrowserStoreSessionResponse {
    return this.toResponse(this.requireSession(sessionId));
  }

  async startSession(dto: StartBrowserStoreSessionDto): Promise<BrowserStoreSessionResponse> {
    const provider = PROVIDERS[dto.provider];
    if (!provider) {
      throw new BadRequestException(`Unsupported browser store provider: ${dto.provider}`);
    }

    const id = randomUUID();
    const profilePath = await this.createProfilePath(dto.provider, id);
    const session: BrowserStoreSessionRecord = {
      id,
      provider: dto.provider,
      displayName: provider.displayName,
      status: 'OPENING',
      loginUrl: provider.loginUrl,
      profilePath,
      headless: dto.headless ?? false,
      createdAt: new Date(),
      openedAt: null,
      closedAt: null,
      currentUrl: null,
      warning: null,
      driverSession: null,
    };

    this.sessions.set(id, session);

    try {
      session.driverSession = await this.driver.launchSession({
        provider: dto.provider,
        profilePath,
        loginUrl: provider.loginUrl,
        headless: session.headless,
      });
      session.status = 'AWAITING_PROVIDER_LOGIN';
      session.openedAt = new Date();
      session.currentUrl = session.driverSession.page.url();
    } catch (error) {
      session.status = 'FAILED';
      session.warning = browserLaunchWarning(error);
    }

    return this.toResponse(session);
  }

  async closeSession(sessionId: string): Promise<BrowserStoreSessionResponse> {
    const session = this.requireSession(sessionId);

    if (session.driverSession) {
      await session.driverSession.context.close();
    }

    session.driverSession = null;
    session.status = 'CLOSED';
    session.closedAt = new Date();

    return this.toResponse(session);
  }

  private async createProfilePath(
    provider: BrowserStoreAutomationProvider,
    sessionId: string,
  ): Promise<string> {
    const baseDir = resolve(
      process.cwd(),
      process.env.FOODPILOT_BROWSER_SESSION_DIR ?? '.foodpilot/browser-sessions',
    );
    const profilePath = resolve(baseDir, provider, sessionId);

    await mkdir(profilePath, { recursive: true, mode: 0o700 });

    return profilePath;
  }

  private requireSession(sessionId: string): BrowserStoreSessionRecord {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Browser store session ${sessionId} was not found`);
    }

    return session;
  }

  private toResponse(session: BrowserStoreSessionRecord): BrowserStoreSessionResponse {
    const warnings = [
      'Do not enter payment card data into FoodPilot. Payment stays inside the provider or bank flow.',
      'FoodPilot does not log cookies, passwords, or payment data from browser sessions.',
    ];

    if (session.warning) {
      warnings.push(session.warning);
    }

    return {
      id: session.id,
      provider: session.provider,
      displayName: session.displayName,
      status: session.status,
      loginUrl: session.loginUrl,
      profilePath: session.profilePath,
      headless: session.headless,
      createdAt: session.createdAt.toISOString(),
      openedAt: session.openedAt?.toISOString() ?? null,
      closedAt: session.closedAt?.toISOString() ?? null,
      currentUrl: session.currentUrl,
      canSearch:
        session.status === 'AWAITING_PROVIDER_LOGIN' ||
        session.status === 'READY_FOR_CART_AUTOMATION',
      canAssembleCart:
        session.status === 'AWAITING_PROVIDER_LOGIN' ||
        session.status === 'READY_FOR_CART_AUTOMATION',
      canSubmitOrder: false,
      canPay: false,
      warnings,
    };
  }
}

function browserLaunchWarning(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return [
    'Browser session could not be opened. Install Playwright browsers with `npx playwright install chromium` and run the API in an environment that can open a browser window for provider login.',
    `Launch error: ${message}`,
  ].join(' ');
}
