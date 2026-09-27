import { chromium, selectors, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { SiteConfig } from '../config.js';
import { execStep } from '../steps/actions.js';

export interface BrowserOptions {
  headed?: boolean;
}

/**
 * Owns the Playwright browser for a run. Every test-case validation gets a fresh context
 * (clean cookies/storage) so results are independent — same isolation Playwright Test gives.
 */
export class BrowserSession {
  private constructor(
    private readonly browser: Browser,
    readonly site: SiteConfig,
  ) {}

  static async launch(site: SiteConfig, opts: BrowserOptions = {}): Promise<BrowserSession> {
    selectors.setTestIdAttribute(site.testIdAttribute ?? 'data-testid');
    const browser = await chromium.launch({ headless: !opts.headed });
    return new BrowserSession(browser, site);
  }

  get testIdAttribute(): string {
    return this.site.testIdAttribute ?? 'data-testid';
  }

  async newPage(): Promise<{ context: BrowserContext; page: Page }> {
    const context = await this.browser.newContext({ baseURL: this.site.baseUrl, viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    return { context, page };
  }

  async authenticate(page: Page): Promise<void> {
    if (!this.site.auth) throw new Error(`Site ${this.site.name} has no auth steps configured`);
    for (const step of this.site.auth.steps) await execStep(page, step, 10_000);
  }

  isAllowedUrl(url: string): boolean {
    return new URL(url, this.site.baseUrl).origin === new URL(this.site.baseUrl).origin;
  }

  async close(): Promise<void> {
    await this.browser.close();
  }
}
