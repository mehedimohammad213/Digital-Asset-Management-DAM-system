import path from 'path';
import fs from 'fs';
import { test, expect } from '@src/fixtures/base.fixture';
import { uniqueTestFile } from '@src/pages/asset-detail.page';
import { cleanupAutomationAssetsInFolder } from '@src/support/asset-cleanup';
import { StepRunner } from '@src/support/step-runner';
import { uniqueTestId, LOCAL_UPLOAD_PREFIX } from '@src/support/test-data';

test.describe('Local upload journey @smoke @regression', () => {
  test.describe.configure({ mode: 'serial' });

  test('full asset lifecycle with local mp4 upload @smoke @regression', async ({
    page,
    env,
    assetsPage,
    assetDetailPage,
    loginPage,
  }) => {
    const steps = new StepRunner(page);

    const testIdentity = uniqueTestId(LOCAL_UPLOAD_PREFIX);
    const initialTitle = 'Automation QA Engineer';
    const updatedTitle = 'Automation QA Engineer - Updated';
    const initialDescription = `DAM automation test asset. Identity: ${testIdentity}`;
    const updatedDescription = `Updated description. Identity: ${testIdentity}`;
    const sourceVideo = path.join(__dirname, '../../test-data/sample.mp4');
    const uniqueVideo = uniqueTestFile(sourceVideo, 'automation-video');
    const uploadedFileName = path.basename(uniqueVideo);
    const assetType = 'Video';

    let itemId = '';

    try {
      await steps.run('Step 1: Navigate to user folder and cleanup', async () => {
        await assetsPage.navigateToAssets();
        await assetsPage.openUserFolder(env.folderName);
        await cleanupAutomationAssetsInFolder(page, env.folderName);
      });

      await steps.run('Step 2-4: Upload mp4, fill metadata, confirm and wait', async () => {
        await assetsPage.clickNewItem();
        await assetsPage.uploadFileViaDragDrop(uniqueVideo);
        await assetDetailPage.fillMetadata({
          title: initialTitle,
          type: assetType,
          dateTime: '',
          description: initialDescription,
          tags: ['automation', 'playwright'],
          isAutomatedTestdata: true,
          hyperlink: 'https://qatest.marcombox.com/',
        });
        await assetDetailPage.save();
        await assetsPage.openUserFolder(env.folderName);
        await expect(page.getByText(/[1-9]\d* items/i).first()).toBeVisible({ timeout: 60_000 });
      });

      await steps.run('Step 5: Open asset and verify file name and metadata', async () => {
        await assetsPage.openAssetByTitle(initialTitle);
        await assetDetailPage.verifyMetadata({
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
        const typeBeforeEdit = await assetDetailPage.getAssetType();
        expect(typeBeforeEdit.toLowerCase()).toBe(assetType.toLowerCase());

        await assetDetailPage.clickEdit();
        await assetDetailPage.updateTitle(updatedTitle);
        await assetDetailPage.updateDateTime();
        await assetDetailPage.updateDescription(updatedDescription);
        await assetDetailPage.saveEdit();

        await assetDetailPage.verifyMetadata({
          title: updatedTitle,
          description: updatedDescription,
        });

        const typeAfterEdit = await assetDetailPage.getAssetType();
        expect(typeAfterEdit.toLowerCase()).toBe(assetType.toLowerCase());

        itemId = await assetDetailPage.getItemId();
        expect(itemId).toBeTruthy();
      });

      await steps.run('Step 8: Close asset and confirm via top text search', async () => {
        await assetDetailPage.close();
        await assetsPage.openAssetFromSearch(testIdentity);
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain(testIdentity);
        expect(bodyText).toContain(itemId);
        await assetDetailPage.close();
      });

      await steps.run('Step 9: Download asset from ellipsis menu', async () => {
        const filename = await assetsPage.downloadAssetFromMenu(updatedTitle);
        expect(filename).toBeTruthy();
      });

      await steps.run('Step 10-11: Share asset via email and confirm ShareLink API success', async () => {
        await assetsPage.shareAssetViaEmailLink(updatedTitle, env.shareEmail);
      });

      await steps.run('Step 12: Delete asset, confirm removal, and logout', async () => {
        await assetsPage.deleteAssetByTitle(updatedTitle);
        await assetsPage.confirmSearchHasNoResults(testIdentity);
        await loginPage.logout();
      });

      steps.assertAllPassed();
    } finally {
      if (fs.existsSync(uniqueVideo)) fs.unlinkSync(uniqueVideo);
    }
  });
});
