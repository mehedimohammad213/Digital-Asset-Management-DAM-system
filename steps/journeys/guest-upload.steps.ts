import path from 'path';
import fs from 'fs';
import { Given, When, Then, expect } from '@src/fixtures/bdd.fixture';
import { uniqueTestFile } from '@src/pages/asset-detail.page';
import { extractGuestUploadUrl } from '@src/support/share-link';
import { uniqueTestId, GUEST_UPLOAD_PREFIX, USER_FOLDER } from '@src/support/test-data';
import { GuestUploadPage } from '@src/pages/guest-upload.page';

Given('I open the user folder in DAM assets', async ({ assetsPage, guestUpload }) => {
  guestUpload.testIdentity = uniqueTestId(GUEST_UPLOAD_PREFIX);
  const sourceImage = path.join(__dirname, '../../test-data/sample.jpg');
  guestUpload.uniqueImage = uniqueTestFile(
    sourceImage,
    `automation-image-${guestUpload.testIdentity}`,
  );
  guestUpload.imageStem = path.parse(guestUpload.uniqueImage).name;

  await assetsPage.navigateToAssets();
  await assetsPage.openUserFolder(USER_FOLDER);
});

When('I send a guest upload invite by email', async ({ assetsPage, env, guestUpload, context }) => {
  await assetsPage.enableEditMode();
  await assetsPage.rightClickFolder(USER_FOLDER);
  await assetsPage.clickGuestUploadShare();
  guestUpload.guestLinkTimestamp = new Date();

  const shareLinkResponse = await assetsPage.sendGuestUploadInvite(env.shareEmail);
  guestUpload.shareLinkSuccess = shareLinkResponse.ok();

  if (!guestUpload.shareLinkSuccess) return;

  const guestUploadUrl = await extractGuestUploadUrl(shareLinkResponse);
  expect(guestUploadUrl, 'ShareLink response should include a guest upload URL').toBeTruthy();

  const guestPage = await context.newPage();
  const guestUploadPage = new GuestUploadPage(guestPage);
  await guestUploadPage.openLink(guestUploadUrl!);
  await guestUploadPage.uploadFile(guestUpload.uniqueImage);
  await guestPage.close();
});

When('I wait two minutes after the share link is sent', async ({ guestUpload }) => {
  if (!guestUpload.shareLinkSuccess) return;
  await new Promise((resolve) => setTimeout(resolve, 120_000));
});

Then(
  'the uploaded jpg should appear in the DAM folder',
  async ({ page, assetsPage, guestUpload }) => {
    try {
      await page.bringToFront();
      await assetsPage.navigateToAssets();
      await assetsPage.openUserFolder(USER_FOLDER);
      await assetsPage.verifyAssetExists(guestUpload.imageStem);
    } finally {
      if (guestUpload.uniqueImage && fs.existsSync(guestUpload.uniqueImage)) {
        fs.unlinkSync(guestUpload.uniqueImage);
      }
    }
  },
);
