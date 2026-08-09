import { expect, type APIResponse } from '@playwright/test';
import { test as base, createBdd } from 'playwright-bdd';
import * as allure from 'allure-js-commons';
import { getEnv, type TestEnv } from '../config/environment';
import { AssetsPage } from '../pages/assets.page';
import { AssetDetailPage } from '../pages/asset-detail.page';
import { LoginPage } from '../pages/login.page';
import { YopmailClient } from '../support/yopmail';

export type LocalUploadState = {
  testIdentity: string;
  initialTitle: string;
  updatedTitle: string;
  initialDescription: string;
  updatedDescription: string;
  uniqueVideo: string;
  uploadedFileName: string;
  assetType: string;
  itemId: string;
};

export type GuestUploadState = {
  testIdentity: string;
  uniqueImage: string;
  imageStem: string;
  guestLinkTimestamp?: Date;
  shareLinkSuccess?: boolean;
};

type BddFixtures = {
  env: TestEnv;
  loginPage: LoginPage;
  assetsPage: AssetsPage;
  assetDetailPage: AssetDetailPage;
  yopmailApi: YopmailClient;
  localUpload: LocalUploadState;
  guestUpload: GuestUploadState;
  apiResponse: { last?: APIResponse };
  allureTags: void;
};

export const test = base.extend<BddFixtures>({
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

  // eslint-disable-next-line no-empty-pattern
  localUpload: async ({}, use) => {
    await use({} as LocalUploadState);
  },

  // eslint-disable-next-line no-empty-pattern
  guestUpload: async ({}, use) => {
    await use({} as GuestUploadState);
  },

  // eslint-disable-next-line no-empty-pattern
  apiResponse: async ({}, use) => {
    await use({});
  },

  allureTags: [
    async ({ $tags }, use) => {
      for (const tag of $tags) {
        const cleanTag = tag.replace('@', '');
        if (cleanTag.startsWith('epic:')) {
          await allure.epic(cleanTag.split(':')[1].replace(/_/g, ' '));
        }
        if (cleanTag.startsWith('feature:')) {
          await allure.feature(cleanTag.split(':')[1].replace(/_/g, ' '));
        }
        if (cleanTag.startsWith('story:')) {
          await allure.story(cleanTag.split(':')[1].replace(/_/g, ' '));
        }
        if (cleanTag.startsWith('severity:')) {
          await allure.severity(cleanTag.split(':')[1] as allure.Severity);
        }
      }
      await use();
    },
    { auto: true },
  ],
});

export const { Given, When, Then, BeforeScenario } = createBdd(test);
export { expect };
