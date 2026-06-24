import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BrowserStoreDriver,
  BrowserStoreDriverLaunchInput,
  BrowserStoreDriverSession,
} from '../src/store-adapters/browser-store-driver';
import { BrowserStoreSessionService } from '../src/store-adapters/browser-store-session.service';

class FakeBrowserStoreDriver implements BrowserStoreDriver {
  readonly close = jest.fn().mockResolvedValue(undefined);
  readonly launchInputs: BrowserStoreDriverLaunchInput[] = [];

  async launchSession(input: BrowserStoreDriverLaunchInput): Promise<BrowserStoreDriverSession> {
    this.launchInputs.push(input);

    return {
      context: {
        close: this.close,
      },
      page: {
        url: () => `${input.loginUrl}?opened=1`,
      },
    } as unknown as BrowserStoreDriverSession;
  }
}

class FailingBrowserStoreDriver implements BrowserStoreDriver {
  async launchSession(): Promise<BrowserStoreDriverSession> {
    throw new Error('chromium executable is missing');
  }
}

describe('BrowserStoreSessionService', () => {
  const originalSessionDir = process.env.FOODPILOT_BROWSER_SESSION_DIR;
  let sessionDir: string;

  beforeEach(async () => {
    sessionDir = await mkdtemp(join(tmpdir(), 'foodpilot-browser-sessions-'));
    process.env.FOODPILOT_BROWSER_SESSION_DIR = sessionDir;
  });

  afterEach(async () => {
    if (originalSessionDir === undefined) {
      delete process.env.FOODPILOT_BROWSER_SESSION_DIR;
    } else {
      process.env.FOODPILOT_BROWSER_SESSION_DIR = originalSessionDir;
    }

    await rm(sessionDir, { recursive: true, force: true });
  });

  it('opens a user-owned provider browser session without exposing cookies or passwords', async () => {
    const driver = new FakeBrowserStoreDriver();
    const service = new BrowserStoreSessionService(driver);

    const session = await service.startSession({
      provider: 'yandex-eda',
      headless: true,
    });

    expect(session.provider).toBe('yandex-eda');
    expect(session.displayName).toBe('Яндекс Еда');
    expect(session.status).toBe('AWAITING_PROVIDER_LOGIN');
    expect(session.loginUrl).toBe('https://eda.yandex.ru/');
    expect(session.currentUrl).toBe('https://eda.yandex.ru/?opened=1');
    expect(session.canAssembleCart).toBe(true);
    expect(session.canSubmitOrder).toBe(false);
    expect(session.canPay).toBe(false);
    expect(session.warnings.join(' ')).not.toMatch(/cookie=|password=/i);
    expect(driver.launchInputs[0]).toEqual(
      expect.objectContaining({
        provider: 'yandex-eda',
        loginUrl: 'https://eda.yandex.ru/',
        headless: true,
      }),
    );
  });

  it('closes an active browser session context', async () => {
    const driver = new FakeBrowserStoreDriver();
    const service = new BrowserStoreSessionService(driver);

    const session = await service.startSession({ provider: 'magnit' });
    const closed = await service.closeSession(session.id);

    expect(closed.status).toBe('CLOSED');
    expect(closed.closedAt).not.toBeNull();
    expect(driver.close).toHaveBeenCalledTimes(1);
  });

  it('returns a failed session when Playwright cannot open the browser', async () => {
    const service = new BrowserStoreSessionService(new FailingBrowserStoreDriver());

    const session = await service.startSession({ provider: 'pyaterochka' });

    expect(session.status).toBe('FAILED');
    expect(session.canSearch).toBe(false);
    expect(session.warnings.join(' ')).toContain('chromium executable is missing');
  });
});
