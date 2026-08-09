import { test as base, expect } from '@playwright/test';
import { getMarcomboxEnv, type MarcomboxEnv } from '../config/marcombox.environment';
import { MarcomboxAssetsPage } from '../pages/marcombox-assets.page';
import { MarcomboxAssetDetailPage } from '../pages/marcombox-asset-detail.page';
import { MarcomboxGuestUploadPage } from '../pages/marcombox-guest-upload.page';
import { MarcomboxLoginPage } from '../pages/marcombox-login.page';
import {
  MarcomboxYopmailBrowserClient,
  MarcomboxYopmailClient,
} from '../support/marcombox.yopmail';

type MarcomboxFixtures = {
  marcomboxEnv: MarcomboxEnv;
  marcomboxLoginPage: MarcomboxLoginPage;
  marcomboxAssetsPage: MarcomboxAssetsPage;
  marcomboxAssetDetailPage: MarcomboxAssetDetailPage;
  marcomboxGuestUploadPage: MarcomboxGuestUploadPage;
  marcomboxYopmailApi: MarcomboxYopmailClient;
  createMarcomboxYopmailBrowser: (email?: string) => MarcomboxYopmailBrowserClient;
};

export const test = base.extend<MarcomboxFixtures>({
  // Playwright requires `{}` destructuring when a fixture has no dependencies.
  // eslint-disable-next-line no-empty-pattern
  marcomboxEnv: async ({}, use) => {
    await use(getMarcomboxEnv());
  },

  marcomboxLoginPage: async ({ page }, use) => {
    await use(new MarcomboxLoginPage(page));
  },

  marcomboxAssetsPage: async ({ page }, use) => {
    await use(new MarcomboxAssetsPage(page));
  },

  marcomboxAssetDetailPage: async ({ page }, use) => {
    await use(new MarcomboxAssetDetailPage(page));
  },

  marcomboxGuestUploadPage: async ({ page }, use) => {
    await use(new MarcomboxGuestUploadPage(page));
  },

  marcomboxYopmailApi: async ({ request, marcomboxEnv }, use) => {
    await use(new MarcomboxYopmailClient(request, marcomboxEnv.testEmail));
  },

  createMarcomboxYopmailBrowser: async ({ page, marcomboxEnv }, use) => {
    await use(
      (email?: string) => new MarcomboxYopmailBrowserClient(page, email ?? marcomboxEnv.testEmail),
    );
  },
});

export { expect };

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'marcombox-authenticated') return;

  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  if (/Login/i.test(page.url())) {
    const env = getMarcomboxEnv();
    await new MarcomboxLoginPage(page).login(env.email, env.password);
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
  }

  await expect(page.getByRole('button', { name: 'DAM' })).toBeVisible({ timeout: 60_000 });
});
