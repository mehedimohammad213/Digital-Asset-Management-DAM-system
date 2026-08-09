import path from 'path';
import fs from 'fs';
import { test, expect } from '@marcombox/fixtures/marcombox.fixture';
import { uniqueMarcomboxTestFile } from '@marcombox/pages/marcombox-asset-detail.page';
import { cleanupMarcomboxAutomationAssetsInFolder } from '@marcombox/support/marcombox.asset-cleanup';
import { waitForMarcomboxEmail } from '@marcombox/support/marcombox.email';
import { MarcomboxStepRunner } from '@marcombox/support/marcombox.step-runner';
import {
  uniqueMarcomboxTestId,
  MARCOMBOX_LOCAL_UPLOAD_PREFIX,
} from '@marcombox/support/marcombox.test-data';
import { MarcomboxYopmailBrowserClient } from '@marcombox/support/marcombox.yopmail';

test.describe('MarcomBox local upload journey @smoke @regression', () => {
  test.describe.configure({ mode: 'serial' });

  test('full asset lifecycle with local mp4 upload @smoke @regression', async ({
    page,
    context,
    marcomboxEnv,
    marcomboxAssetsPage,
    marcomboxAssetDetailPage,
    marcomboxLoginPage,
    marcomboxYopmailApi,
  }) => {
    const steps = new MarcomboxStepRunner(page);

    const testIdentity = uniqueMarcomboxTestId(MARCOMBOX_LOCAL_UPLOAD_PREFIX);
    const initialTitle = 'Automation QA Engineer';
    const updatedTitle = 'Automation QA Engineer - Updated';
    const initialDescription = `MarcomBox automation test asset. Identity: ${testIdentity}`;
    const updatedDescription = `Updated description. Identity: ${testIdentity}`;
    const sourceVideo = path.join(__dirname, '../../test-data/marcombox/sample.mp4');
    const uniqueVideo = uniqueMarcomboxTestFile(sourceVideo, 'automation-video');
    const uploadedFileName = path.basename(uniqueVideo);
    const assetType = 'Video';

    let itemId = '';
    let shareTimestamp: Date | undefined;

    try {
      await steps.run('Step 1: Navigate to user folder and cleanup', async () => {
        await marcomboxAssetsPage.navigateToAssets();
        await marcomboxAssetsPage.openUserFolder(marcomboxEnv.folderName);
        await cleanupMarcomboxAutomationAssetsInFolder(page, marcomboxEnv.folderName);
      });

      await steps.run('Step 2-4: Upload mp4, fill metadata, confirm and wait', async () => {
        await marcomboxAssetsPage.clickNewItem();
        await marcomboxAssetsPage.uploadFileViaDragDrop(uniqueVideo);
        await marcomboxAssetDetailPage.fillMetadata({
          title: initialTitle,
          type: assetType,
          dateTime: '',
          description: initialDescription,
          tags: ['automation', 'playwright'],
          isAutomatedTestdata: true,
          hyperlink: 'https://qatest.marcombox.com/',
        });
        await marcomboxAssetDetailPage.save();
        await marcomboxAssetsPage.openUserFolder(marcomboxEnv.folderName);
        await expect(page.getByText(/[1-9]\d* items/i).first()).toBeVisible({ timeout: 60_000 });
      });

      await steps.run('Step 5: Open asset and verify file name and metadata', async () => {
        await marcomboxAssetsPage.openAssetByTitle(initialTitle);
        await marcomboxAssetDetailPage.verifyMetadata({
          title: initialTitle,
          type: assetType,
          description: initialDescription,
          tags: ['automation', 'playwright'],
          isAutomatedTestdata: true,
          hyperlink: 'https://qatest.marcombox.com/',
          fileName: uploadedFileName,
        });
      });

      await steps.run('Step 6-7: Edit asset, confirm changes, capture item ID', async () => {
        const typeBeforeEdit = await marcomboxAssetDetailPage.getAssetType();
        expect(typeBeforeEdit.toLowerCase()).toBe(assetType.toLowerCase());

        await marcomboxAssetDetailPage.clickEdit();
        await marcomboxAssetDetailPage.updateTitle(updatedTitle);
        await marcomboxAssetDetailPage.updateDateTime();
        await marcomboxAssetDetailPage.updateDescription(updatedDescription);
        await marcomboxAssetDetailPage.saveEdit();

        await marcomboxAssetDetailPage.verifyMetadata({
          title: updatedTitle,
          description: updatedDescription,
        });

        const typeAfterEdit = await marcomboxAssetDetailPage.getAssetType();
        expect(typeAfterEdit.toLowerCase()).toBe(assetType.toLowerCase());

        itemId = await marcomboxAssetDetailPage.getItemId();
        expect(itemId).toBeTruthy();
      });

      await steps.run('Step 8: Close asset and confirm via top text search', async () => {
        await marcomboxAssetDetailPage.close();
        await marcomboxAssetsPage.openAssetFromSearch(testIdentity);
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain(testIdentity);
        expect(bodyText).toContain(itemId);
        await marcomboxAssetDetailPage.close();
      });

      await steps.run('Step 9: Download asset from ellipsis menu', async () => {
        const filename = await marcomboxAssetsPage.downloadAssetFromMenu(updatedTitle);
        expect(filename).toBeTruthy();
      });

      await steps.run('Step 10: Share asset via email', async () => {
        shareTimestamp = new Date();
        await marcomboxAssetsPage.shareAssetViaEmailLink(updatedTitle, marcomboxEnv.testEmail);
      });

      await steps.run('Step 11: Verify share email in inbox', async () => {
        const yopmailPage = await context.newPage();
        const browserClient = new MarcomboxYopmailBrowserClient(
          yopmailPage,
          marcomboxEnv.testEmail,
        );
        const mail = await waitForMarcomboxEmail(marcomboxYopmailApi, browserClient, {
          bodyContains: updatedTitle,
          since: shareTimestamp ?? new Date(0),
          timeoutMs: 120_000,
        });
        expect(mail.body).toContain(updatedTitle);
        await yopmailPage.close();
      });

      await steps.run('Step 12: Delete asset, confirm removal, and logout', async () => {
        await marcomboxAssetsPage.deleteAssetByTitle(updatedTitle);
        await marcomboxAssetsPage.confirmSearchHasNoResults(testIdentity);
        await marcomboxLoginPage.logout();
      });

      steps.assertAllPassed();
    } finally {
      if (fs.existsSync(uniqueVideo)) fs.unlinkSync(uniqueVideo);
    }
  });
});
