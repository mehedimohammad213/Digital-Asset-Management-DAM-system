import path from 'path';
import fs from 'fs';
import { test, expect } from '../src/fixtures/test.fixture';
import { uniqueTestFile } from '../src/pages/AssetDetailPage';
import { extractOtpFromBody, waitForEmailWithFallback } from '../src/helpers/email';
import { uniqueTestId, SCENARIO2_PREFIX } from '../src/helpers/testData';
import { YopmailBrowserClient } from '../src/helpers/yopmail';
import { GuestUploadPage } from '../src/pages/GuestUploadPage';

test.describe('Scenario 2: Folder Upload and Filter @regression', () => {
  test.describe.configure({ mode: 'serial' });

  test('guest upload jpg via folder share link @regression', async ({
    page,
    context,
    env,
    assetsPage,
    loginPage,
    yopmailApi,
  }) => {
    const testIdentity = uniqueTestId(SCENARIO2_PREFIX);
    const sourceImage = path.join(__dirname, '../test-data/sample.jpg');
    const uniqueImage = uniqueTestFile(sourceImage, `automation-image-${testIdentity}`);
    const imageStem = path.parse(uniqueImage).name;

    let guestLinkTimestamp: Date;

    try {
      await test.step('Navigate to DAM Assets', async () => {
        await assetsPage.navigateToAssets();
      });

      await test.step('Enable edit mode and send guest upload invite', async () => {
        await assetsPage.enableEditMode();
        await assetsPage.rightClickFolder(env.folderName);
        await assetsPage.clickGuestUploadShare();
        guestLinkTimestamp = new Date();
        await assetsPage.sendGuestUploadInvite(env.testEmail);
      });

      await test.step('Open guest link and verify via OTP', async () => {
        const yopmailPage = await context.newPage();
        const browserClient = new YopmailBrowserClient(yopmailPage, env.testEmail);

        const inviteMail = await waitForEmailWithFallback(yopmailApi, browserClient, {
          bodyContains: 'marcombox',
          since: guestLinkTimestamp,
          timeoutMs: 120_000,
        });
        expect(inviteMail.link).toBeTruthy();
        await yopmailPage.close();

        const guestPage = await context.newPage();
        const guestUpload = new GuestUploadPage(guestPage);
        await guestUpload.openLink(inviteMail.link!);

        const otpYopmailPage = await context.newPage();
        const otpBrowserClient = new YopmailBrowserClient(otpYopmailPage, env.testEmail);
        const otpMail = await waitForEmailWithFallback(yopmailApi, otpBrowserClient, {
          bodyMatches: /\b\d{4,8}\b/,
          since: guestLinkTimestamp,
          timeoutMs: 120_000,
        });
        const otp = extractOtpFromBody(otpMail.body);
        await guestUpload.enterOtp(otp);
        await otpYopmailPage.close();

        await guestUpload.uploadFile(uniqueImage);
        await guestPage.close();
      });

      await test.step('Verify jpg uploaded in DAM folder', async () => {
        await page.bringToFront();
        await assetsPage.navigateToAssets();
        await assetsPage.openUserFolder(env.folderName);
        await assetsPage.verifyAssetExists(imageStem);
      });

      await test.step('Cleanup uploaded asset', async () => {
        await assetsPage.deleteAsset(imageStem);
        await assetsPage.confirmAssetNotVisible(imageStem);
        await loginPage.logout();
      });
    } finally {
      if (fs.existsSync(uniqueImage)) fs.unlinkSync(uniqueImage);
    }
  });
});
