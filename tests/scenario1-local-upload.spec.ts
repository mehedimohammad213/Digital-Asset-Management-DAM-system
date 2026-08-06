import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { LoginPage } from '../src/pages/LoginPage';
import { AssetsPage } from '../src/pages/AssetsPage';
import { AssetDetailPage, uniqueTestFile } from '../src/pages/AssetDetailPage';
import { YopmailBrowserClient } from '../src/helpers/yopmail';
import { uniqueTestId, SCENARIO1_PREFIX } from '../src/helpers/testData';

const email = process.env.MARCOMBOX_EMAIL!;
const password = process.env.MARCOMBOX_PASSWORD!;
const folderName = process.env.USER_FOLDER_NAME || 'mehedi';
const testEmail = process.env.TEST_EMAIL || email;

test.describe('Scenario 1: Local Upload and Text Search', () => {
  test('full asset lifecycle with local mp4 upload', async ({ page, context }) => {
    const testIdentity = uniqueTestId(SCENARIO1_PREFIX);
    const initialTitle = 'Automation QA Engineer';
    const updatedTitle = 'Automation QA Engineer - Updated';
    const initialDescription = `MarcomBox automation test asset. Identity: ${testIdentity}`;
    const updatedDescription = `Updated description. Identity: ${testIdentity}`;
    const sourceVideo = path.join(__dirname, '../test-data/sample.mp4');
    const uniqueVideo = uniqueTestFile(sourceVideo, 'automation-video');
    const videoFileName = path.basename(uniqueVideo);

    const loginPage = new LoginPage(page);
    const assetsPage = new AssetsPage(page);
    const assetDetail = new AssetDetailPage(page);
    let itemId = '';
    let shareTimestamp: Date;

    try {
      await test.step('Sign in and navigate to user folder', async () => {
        await loginPage.login(email, password);
        await assetsPage.navigateToAssets();
        await assetsPage.openUserFolder(folderName);
        // Clear all files in user folder before test (folder should only contain test data)
        const assets = page.locator('[role="group"]').filter({ hasNotText: 'subfolders' });
        while (await assets.count() > 0) {
          await assets.first().hover();
          await assets.first().locator('button').last().click().catch(() => undefined);
          const deleteBtn = page.getByRole('menuitem', { name: /delete/i }).or(page.getByText('Delete', { exact: true }));
          if (await deleteBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            await deleteBtn.first().click();
            const confirm = page.getByRole('button', { name: /confirm|yes|delete/i }).last();
            if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) await confirm.click();
            await page.waitForTimeout(2000);
          } else {
            break;
          }
        }
      });

      await test.step('Upload mp4 and create asset with metadata', async () => {
        await assetsPage.clickNewItem();
        await assetsPage.uploadFileViaDragDrop(uniqueVideo);
        await page.waitForTimeout(12000);

        await assetDetail.fillMetadata({
          title: initialTitle,
          type: 'Video',
          dateTime: '',
          description: initialDescription,
          tags: ['automation', 'playwright'],
          isAutomatedTestdata: true,
          hyperlink: 'https://qatest.marcombox.com/',
        });
        await assetDetail.save();
        await page.waitForTimeout(5000);
        await assetsPage.searchAsset('');
        await page.getByRole('button', { name: 'Clear' }).click().catch(() => undefined);
        await expect(page.getByText(/\d+ items/i)).toBeVisible({ timeout: 30_000 });
      });

      await test.step('Open asset and verify file name and metadata', async () => {
        await assetsPage.openAsset(testIdentity, path.parse(videoFileName).name, initialTitle);
        await assetDetail.verifyMetadata({
          hyperlink: 'https://qatest.marcombox.com/',
        });
        const detailText = await page.locator('body').innerText();
        expect(detailText.toLowerCase()).toMatch(/sample\.mp4|automation|item id/);
      });

      await test.step('Edit asset and confirm changes', async () => {
        await assetDetail.clickEdit();
        await assetDetail.updateTitle(updatedTitle);
        await assetDetail.updateDateTime();
        await assetDetail.updateDescription(updatedDescription);
        await assetDetail.saveEdit();

        await assetDetail.verifyMetadata({
          title: updatedTitle,
          type: 'Video',
          description: updatedDescription,
        });
        itemId = await assetDetail.getItemId();
        await assetDetail.close();
      });

      await test.step('Search asset by title and confirm identity and item ID', async () => {
        await assetsPage.searchAsset(updatedTitle);
        await expect(page.getByText(updatedTitle).or(page.getByText(itemId))).toBeVisible();
        await assetsPage.openAsset(updatedTitle, itemId);
        expect(await page.locator('body').innerText()).toContain(testIdentity);
        await assetDetail.close();
      });

      await test.step('Download asset from ellipsis menu', async () => {
        await assetsPage.searchAsset(updatedTitle);
        const filename = await assetsPage.downloadAsset(updatedTitle);
        expect(filename).toBeTruthy();
      });

      await test.step('Share asset via email', async () => {
        shareTimestamp = new Date();
        await assetsPage.shareAsset(updatedTitle, testEmail);
      });

      await test.step('Verify share email in inbox', async () => {
        const yopmailPage = await context.newPage();
        const yopmail = new YopmailBrowserClient(yopmailPage, testEmail);
        const mail = await yopmail.waitForEmail({
          bodyContains: updatedTitle,
          since: shareTimestamp,
          timeoutMs: 120_000,
        });
        expect(mail.body).toContain(updatedTitle);
        await yopmailPage.close();
      });

      await test.step('Delete asset and logout', async () => {
        await assetsPage.searchAsset(updatedTitle);
        await assetsPage.deleteAsset(updatedTitle);
        await assetsPage.confirmAssetNotVisible(updatedTitle);
        await loginPage.logout();
      });
    } finally {
      if (fs.existsSync(uniqueVideo)) fs.unlinkSync(uniqueVideo);
    }
  });
});
