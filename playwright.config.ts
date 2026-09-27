import { defineConfig, devices } from '@playwright/test';
import demoShop from './sites/demo-shop.site';
import saucedemo from './sites/saucedemo.site';

/**
 * Three projects:
 *  - self-tests : tests for the agent framework itself (schema, grounding, codegen, pipeline)
 *  - demo-shop  : generated specs for the bundled offline shop
 *  - saucedemo  : generated specs for https://www.saucedemo.com
 */
export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node demo-site/server.mjs',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'self-tests', testDir: './tests', timeout: 60_000 },
    {
      name: 'demo-shop',
      testDir: './generated/demo-shop',
      use: { baseURL: demoShop.baseUrl, testIdAttribute: demoShop.testIdAttribute },
    },
    {
      name: 'saucedemo',
      testDir: './generated/saucedemo',
      use: { baseURL: saucedemo.baseUrl, testIdAttribute: saucedemo.testIdAttribute },
    },
  ],
});
