import path from 'path';
import fs from 'fs';
import { test, expect } from '../src/fixtures/test.fixture';
import { uniqueTestFile } from '../src/pages/AssetDetailPage';
import { cleanupAutomationAssetsInFolder } from '../src/helpers/cleanup';
import { waitForEmailWithFallback } from '../src/helpers/email';
import { uniqueTestId, SCENARIO1_PREFIX } from '../src/helpers/testData';
import { YopmailBrowserClient } from '../src/helpers/yopmail';

test.describe('Scenario 1: Local Upload and Text Search @regression', () => {
  test.describe.configure({ mode: 'serial' });

  test('full asset lifecycle with local mp4 upload @regression', async ({
    page,
    context,
    env,
    assetsPage,
    assetDetailPage,
    loginPage,
    yopmailApi,
  }) => {
    const testIdentity = uniqueTestId(SCENARIO1_PREFIX);
    const initialTitle = 'Automation QA Engineer';
    const updatedTitle = 'Automation QA Engineer - Updated';
    const initialDescription = `MarcomBox automation test asset. Identity: ${testIdentity}`;
    const updatedDescription = `Updated description. Identity: ${testIdentity}`;
    const sourceVideo = path.join(__dirname, '../test-data/sample.mp4');
    const uniqueVideo = uniqueTestFile(sourceVideo, 'automation-video');

    let itemId = '';
    let shareTimestamp: Date;

    try {
      await test.step('Navigate to user folder and remove leftover automation assets', async () => {
        await assetsPage.navigateToAssets();
        await cleanupAutomationAssetsInFolder(page, env.folderName);
      });

      await test.step('Upload mp4 and create asset with metadata', async () => {
        await assetsPage.clickNewItem();
        await assetsPage.uploadFileViaDragDrop(uniqueVideo);
        await assetDetailPage.fillMetadata({
          title: initialTitle,
          type: 'Video',
          dateTime: '',
          description: initialDescription,
          tags: ['automation', 'playwright'],
          isAutomatedTestdata: true,
          hyperlink: 'https://qatest.marcombox.com/',
        });
        await assetDetailPage.save();
        await assetsPage.openUserFolder(env.folderName);
      });

      await test.step('Open asset and verify file name and metadata', async () => {
        await assetsPage.openAssetByDetailMatch([testIdentity, initialTitle]);
        await assetDetailPage.verifyMetadata({
          title: initialTitle,
          hyperlink: 'https://qatest.marcombox.com/',
        });
        const detailText = await page.locator('body').innerText();
        expect(detailText.toLowerCase()).toMatch(/sample\.mp4|automation|item id/);
      });

      await test.step('Edit asset and confirm changes', async () => {
        await assetDetailPage.clickEdit();
        await assetDetailPage.updateTitle(updatedTitle);
        await assetDetailPage.updateDateTime();
        await assetDetailPage.updateDescription(updatedDescription);
        await assetDetailPage.saveEdit();

        await assetDetailPage.verifyMetadata({
          title: updatedTitle,
          description: updatedDescription,
        });
        itemId = await assetDetailPage.getItemId();
        await assetDetailPage.close();
      });

      await test.step('Search asset by title and confirm identity and item ID', async () => {
        await assetsPage.openAssetByDetailMatch([testIdentity, updatedTitle, itemId]);
        expect(await page.locator('body').innerText()).toContain(testIdentity);
        await assetDetailPage.close();
      });

      await test.step('Download asset from ellipsis menu', async () => {
        const filename = await assetsPage.downloadAssetByDetailMatch([
          updatedTitle,
          itemId,
          testIdentity,
        ]);
        expect(filename).toBeTruthy();
      });

      await test.step('Share asset via email', async () => {
        shareTimestamp = new Date();
        await assetsPage.shareAssetByDetailMatch(
          [updatedTitle, itemId, testIdentity],
          env.testEmail,
        );
      });

      await test.step('Verify share email in inbox', async () => {
        const yopmailPage = await context.newPage();
        const browserClient = new YopmailBrowserClient(yopmailPage, env.testEmail);
        const mail = await waitForEmailWithFallback(yopmailApi, browserClient, {
          bodyContains: updatedTitle,
          since: shareTimestamp,
          timeoutMs: 120_000,
        });
        expect(mail.body).toContain(updatedTitle);
        await yopmailPage.close();
      });

      await test.step('Delete asset and logout', async () => {
        await assetsPage.deleteAssetByDetailMatch([updatedTitle, itemId, testIdentity]);
        await loginPage.logout();
      });
    } finally {
      if (fs.existsSync(uniqueVideo)) fs.unlinkSync(uniqueVideo);
    }
  });
});
