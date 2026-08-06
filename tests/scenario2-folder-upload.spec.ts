import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { LoginPage } from '../src/pages/LoginPage';
import { AssetsPage } from '../src/pages/AssetsPage';
import { GuestUploadPage } from '../src/pages/GuestUploadPage';
import { AssetDetailPage, uniqueTestFile } from '../src/pages/AssetDetailPage';
import { YopmailBrowserClient } from '../src/helpers/yopmail';
import { uniqueTestId, SCENARIO2_PREFIX } from '../src/helpers/testData';

const email = process.env.MARCOMBOX_EMAIL!;
const password = process.env.MARCOMBOX_PASSWORD!;
const folderName = process.env.USER_FOLDER_NAME || 'mehedi';
const testEmail = process.env.TEST_EMAIL || email;

test.describe('Scenario 2: Folder Upload and Filter', () => {
  test('guest upload jpg via folder share link', async ({ page, context }) => {
    const testIdentity = uniqueTestId(SCENARIO2_PREFIX);
    const sourceImage = path.join(__dirname, '../test-data/sample.jpg');
    const uniqueImage = uniqueTestFile(sourceImage, `automation-image-${testIdentity}`);
    const imageStem = path.parse(uniqueImage).name;

    const loginPage = new LoginPage(page);
    const assetsPage = new AssetsPage(page);
    let guestLinkTimestamp: Date;

    try {
      await test.step('Sign in and navigate to DAM Assets', async () => {
        await loginPage.login(email, password);
        await assetsPage.navigateToAssets();
      });

      await test.step('Enable edit mode and send guest upload invite', async () => {
        await assetsPage.enableEditMode();
        await assetsPage.rightClickFolder(folderName);
        await assetsPage.clickGuestUploadShare();
        guestLinkTimestamp = new Date();
        await assetsPage.sendGuestUploadInvite(testEmail);
      });

      await test.step('Open guest link and verify via OTP', async () => {
        const yopmailPage = await context.newPage();
        const yopmail = new YopmailBrowserClient(yopmailPage, testEmail);

        const inviteMail = await yopmail.waitForEmail({
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
        const otpClient = new YopmailBrowserClient(otpYopmailPage, testEmail);
        const otpMail = await otpClient.waitForEmail({
          bodyContains: /\d{4,8}/.source,
          since: guestLinkTimestamp,
          timeoutMs: 120_000,
        });
        const otp = otpClient.extractOtp(otpMail.body);
        await guestUpload.enterOtp(otp);
        await otpYopmailPage.close();

        await guestUpload.uploadFile(uniqueImage);
        await guestPage.close();
      });

      await test.step('Verify jpg uploaded in DAM folder', async () => {
        await page.bringToFront();
        await assetsPage.navigateToAssets();
        await assetsPage.openUserFolder(folderName);
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
