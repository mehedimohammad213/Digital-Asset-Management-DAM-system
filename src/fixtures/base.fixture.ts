import { test as base, expect } from '@playwright/test';
import { getEnv, type TestEnv } from '../config/environment';
import { AssetsPage } from '../pages/assets.page';
import { AssetDetailPage } from '../pages/asset-detail.page';
import { LoginPage } from '../pages/login.page';
import { YopmailClient } from '../support/yopmail';

type AppFixtures = {
  env: TestEnv;
  loginPage: LoginPage;
  assetsPage: AssetsPage;
  assetDetailPage: AssetDetailPage;
  yopmailApi: YopmailClient;
};

export const test = base.extend<AppFixtures>({
  // Playwright requires `{}` destructuring when a fixture has no dependencies.
  // eslint-disable-next-line no-empty-pattern
  env: async ({}, use) => {
    await use(getEnv());
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  assetsPage: async ({ page }, use) => {
    await use(new AssetsPage(page));
  },

  assetDetailPage: async ({ page }, use) => {
    await use(new AssetDetailPage(page));
  },

  yopmailApi: async ({ request, env }, use) => {
    await use(new YopmailClient(request, env.testEmail));
  },
});

export { expect };

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'chromium') return;

  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  if (/Login/i.test(page.url())) {
    const env = getEnv();
    await new LoginPage(page).login(env.email, env.password);
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
  }

  await expect(page.getByRole('button', { name: 'DAM' })).toBeVisible({ timeout: 60_000 });
});
