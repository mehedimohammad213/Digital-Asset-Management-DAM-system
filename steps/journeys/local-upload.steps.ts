import path from 'path';
import fs from 'fs';
import { Given, When, Then, expect } from '@src/fixtures/bdd.fixture';
import { uniqueTestFile } from '@src/pages/asset-detail.page';
import { cleanupAutomationAssetsInFolder } from '@src/support/asset-cleanup';
import { uniqueTestId, LOCAL_UPLOAD_PREFIX, USER_FOLDER } from '@src/support/test-data';

Given(
  'I navigate to the user folder with automation assets cleaned up',
  async ({ page, assetsPage, localUpload }) => {
    localUpload.testIdentity = uniqueTestId(LOCAL_UPLOAD_PREFIX);
    localUpload.initialTitle = 'Automation QA Engineer';
    localUpload.updatedTitle = 'Automation QA Engineer - Updated';
    localUpload.initialDescription = `DAM automation test asset. Identity: ${localUpload.testIdentity}`;
    localUpload.updatedDescription = `Updated description. Identity: ${localUpload.testIdentity}`;
    localUpload.assetType = 'Video';

    const sourceVideo = path.join(__dirname, '../../test-data/sample.mp4');
    localUpload.uniqueVideo = uniqueTestFile(sourceVideo, 'automation-video');
    localUpload.uploadedFileName = path.basename(localUpload.uniqueVideo);

    await assetsPage.navigateToAssets();
    await assetsPage.openUserFolder(USER_FOLDER);
    await cleanupAutomationAssetsInFolder(page, USER_FOLDER);
  },
);

When(
  'I upload a unique mp4 with metadata',
  async ({ page, assetsPage, assetDetailPage, localUpload }) => {
    await assetsPage.clickNewItem();
    await assetsPage.uploadFileViaDragDrop(localUpload.uniqueVideo);
    await assetDetailPage.fillMetadata({
      title: localUpload.initialTitle,
      type: localUpload.assetType,
      dateTime: '',
      description: localUpload.initialDescription,
      tags: ['automation', 'playwright'],
      isAutomatedTestdata: true,
      hyperlink: 'https://qatest.marcombox.com/',
    });
    await assetDetailPage.save();
    await assetsPage.openUserFolder(USER_FOLDER);
    await expect(page.getByText(/[1-9]\d* items/i).first()).toBeVisible({ timeout: 60_000 });
  },
);

When(
  'I open the asset and verify its metadata',
  async ({ assetsPage, assetDetailPage, localUpload }) => {
    await assetsPage.openAssetByTitle(localUpload.initialTitle);
    await assetDetailPage.verifyMetadata({
      title: localUpload.initialTitle,
      type: localUpload.assetType,
      description: localUpload.initialDescription,
      tags: ['automation', 'playwright'],
      isAutomatedTestdata: true,
      hyperlink: 'https://qatest.marcombox.com/',
      fileName: localUpload.uploadedFileName,
    });
  },
);

When('I edit the asset and capture the item ID', async ({ assetDetailPage, localUpload }) => {
  const typeBeforeEdit = await assetDetailPage.getAssetType();
  expect(typeBeforeEdit.toLowerCase()).toBe(localUpload.assetType.toLowerCase());

  await assetDetailPage.clickEdit();
  await assetDetailPage.updateTitle(localUpload.updatedTitle);
  await assetDetailPage.updateDateTime();
  await assetDetailPage.updateDescription(localUpload.updatedDescription);
  await assetDetailPage.saveEdit();

  await assetDetailPage.verifyMetadata({
    title: localUpload.updatedTitle,
    description: localUpload.updatedDescription,
  });

  const typeAfterEdit = await assetDetailPage.getAssetType();
  expect(typeAfterEdit.toLowerCase()).toBe(localUpload.assetType.toLowerCase());

  localUpload.itemId = await assetDetailPage.getItemId();
  expect(localUpload.itemId).toBeTruthy();
});

When(
  'I search for the asset by identity and verify details',
  async ({ page, assetsPage, assetDetailPage, localUpload }) => {
    await assetDetailPage.close();
    await assetsPage.openAssetFromSearch(localUpload.testIdentity);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain(localUpload.testIdentity);
    expect(bodyText).toContain(localUpload.itemId);
    await assetDetailPage.close();
  },
);

When('I download the asset from the ellipsis menu', async ({ assetsPage, localUpload }) => {
  const filename = await assetsPage.downloadAssetFromMenu(localUpload.updatedTitle);
  expect(filename).toBeTruthy();
});

When('I share the asset via email link', async ({ assetsPage, env, localUpload }) => {
  await assetsPage.shareAssetViaEmailLink(localUpload.updatedTitle, env.shareEmail);
});

Then('I delete the asset and logout', async ({ assetsPage, loginPage, localUpload }) => {
  try {
    await assetsPage.deleteAssetByTitle(localUpload.updatedTitle);
    await assetsPage.confirmSearchHasNoResults(localUpload.testIdentity);
    await loginPage.logout();
  } finally {
    if (localUpload.uniqueVideo && fs.existsSync(localUpload.uniqueVideo)) {
      fs.unlinkSync(localUpload.uniqueVideo);
    }
  }
});
