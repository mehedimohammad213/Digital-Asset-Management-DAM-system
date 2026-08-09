import path from 'path';
import fs from 'fs';
import { Given, When, Then, expect } from '@src/fixtures/bdd.fixture';
import { uniqueTestFile } from '@src/pages/asset-detail.page';
import { extractOtpFromEmailBody, waitForEmailWithFallback } from '@src/support/email';
import { uniqueTestId, GUEST_UPLOAD_PREFIX, USER_FOLDER } from '@src/support/test-data';
import { YopmailBrowserClient } from '@src/support/yopmail';
import { GuestUploadPage } from '@src/pages/guest-upload.page';

Given('I open the user folder in DAM assets', async ({ assetsPage, guestUpload }) => {
  guestUpload.testIdentity = uniqueTestId(GUEST_UPLOAD_PREFIX);
  const sourceImage = path.join(__dirname, '../../test-data/sample.jpg');
  guestUpload.uniqueImage = uniqueTestFile(sourceImage, `automation-image-${guestUpload.testIdentity}`);
  guestUpload.imageStem = path.parse(guestUpload.uniqueImage).name;

  await assetsPage.navigateToAssets();
  await assetsPage.openUserFolder(USER_FOLDER);
});

When('I send a guest upload invite by email', async ({ assetsPage, env, guestUpload }) => {
  await assetsPage.enableEditMode();
  await assetsPage.rightClickFolder(USER_FOLDER);
  await assetsPage.clickGuestUploadShare();
  guestUpload.guestLinkTimestamp = new Date();
  await assetsPage.sendGuestUploadInvite(env.testEmail);
});

When('the guest completes OTP verification and uploads a jpg', async ({
  context,
  env,
  yopmailApi,
  guestUpload,
}) => {
  const yopmailPage = await context.newPage();
  const browserClient = new YopmailBrowserClient(yopmailPage, env.testEmail);

  const inviteMail = await waitForEmailWithFallback(yopmailApi, browserClient, {
    bodyContains: 'marcombox',
    since: guestUpload.guestLinkTimestamp ?? new Date(0),
    timeoutMs: 120_000,
  });
  expect(inviteMail.link).toBeTruthy();
  await yopmailPage.close();

  const guestPage = await context.newPage();
  const guestUploadPage = new GuestUploadPage(guestPage);
  await guestUploadPage.openLink(inviteMail.link!);

  const otpTimestamp = new Date();
  const otpYopmailPage = await context.newPage();
  const otpBrowserClient = new YopmailBrowserClient(otpYopmailPage, env.testEmail);
  const otpMail = await waitForEmailWithFallback(yopmailApi, otpBrowserClient, {
    bodyMatches: /\b\d{4,8}\b/,
    since: otpTimestamp,
    timeoutMs: 120_000,
  });
  const otp = extractOtpFromEmailBody(otpMail.body);
  await guestUploadPage.enterOtp(otp);
  await otpYopmailPage.close();

  await guestUploadPage.uploadFile(guestUpload.uniqueImage);
  await guestPage.close();
});

Then('the uploaded jpg should appear in the DAM folder', async ({ page, assetsPage, guestUpload }) => {
  await page.bringToFront();
  await assetsPage.navigateToAssets();
  await assetsPage.openUserFolder(USER_FOLDER);
  await assetsPage.verifyAssetExists(guestUpload.imageStem);
});

Then('I delete the uploaded asset and logout', async ({ assetsPage, loginPage, guestUpload }) => {
  try {
    await assetsPage.deleteAsset(guestUpload.imageStem);
    await assetsPage.confirmAssetNotVisible(guestUpload.imageStem);
    await loginPage.logout();
  } finally {
    if (guestUpload.uniqueImage && fs.existsSync(guestUpload.uniqueImage)) {
      fs.unlinkSync(guestUpload.uniqueImage);
    }
  }
});
