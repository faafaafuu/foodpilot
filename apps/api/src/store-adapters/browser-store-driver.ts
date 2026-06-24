import { Injectable } from '@nestjs/common';
import { BrowserContext, Page, chromium } from 'playwright';
import { BrowserStoreAutomationProvider } from './store-adapter.types';

export interface BrowserStoreDriverSession {
  context: BrowserContext;
  page: Page;
}

export interface BrowserStoreDriverLaunchInput {
  provider: BrowserStoreAutomationProvider;
  profilePath: string;
  loginUrl: string;
  headless: boolean;
}

export interface BrowserStoreDriver {
  launchSession(input: BrowserStoreDriverLaunchInput): Promise<BrowserStoreDriverSession>;
}

@Injectable()
export class PlaywrightBrowserStoreDriver implements BrowserStoreDriver {
  async launchSession(input: BrowserStoreDriverLaunchInput): Promise<BrowserStoreDriverSession> {
    const context = await chromium.launchPersistentContext(input.profilePath, {
      headless: input.headless,
      viewport: { width: 1366, height: 900 },
      locale: 'ru-RU',
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 FoodPilot/0.1',
    });
    const page = context.pages()[0] ?? (await context.newPage());

    try {
      await page.goto(input.loginUrl, { waitUntil: 'domcontentloaded' });
    } catch (error) {
      await context.close();
      throw error;
    }

    return { context, page };
  }
}
