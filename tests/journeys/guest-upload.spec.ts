import path from 'path';
import fs from 'fs';
import { test, expect } from '@src/fixtures/base.fixture';
import { uniqueTestFile } from '@src/pages/asset-detail.page';
import { extractOtpFromEmailBody, waitForEmailWithFallback } from '@src/support/email';
import { StepRunner } from '@src/support/step-runner';
import { uniqueTestId, GUEST_UPLOAD_PREFIX, USER_FOLDER } from '@src/support/test-data';
import { YopmailBrowserClient } from '@src/support/yopmail';
import { GuestUploadPage } from '@src/pages/guest-upload.page';

test.describe('Guest upload journey @regression', () => {
  test.describe.configure({ mode: 'serial' });

  test('guest upload jpg via folder share link @regression', async ({
    page,
    context,
    env,
    assetsPage,
    loginPage,
    yopmailApi,
  }) => {
    const steps = new StepRunner(page);

    const testIdentity = uniqueTestId(GUEST_UPLOAD_PREFIX);
    const sourceImage = path.join(__dirname, '../../test-data/sample.jpg');
    const uniqueImage = uniqueTestFile(sourceImage, `automation-image-${testIdentity}`);
    const imageStem = path.parse(uniqueImage).name;

    let guestLinkTimestamp: Date | undefined;

    try {
      await steps.run('Step 1: Sign in, go to DAM > Assets, and open user folder', async () => {
        await assetsPage.navigateToAssets();
        await assetsPage.openUserFolder(USER_FOLDER);
      });

      await steps.run(
        'Step 2-4: Enable edit mode, guest upload invite, and send email',
        async () => {
          await assetsPage.enableEditMode();
          await assetsPage.rightClickFolder(USER_FOLDER);
          await assetsPage.clickGuestUploadShare();
          guestLinkTimestamp = new Date();
          await assetsPage.sendGuestUploadInvite(env.testEmail);
        },
      );

      await steps.run('Step 5-7: Open guest link, verify OTP, and upload jpg', async () => {
        const yopmailPage = await context.newPage();
        const browserClient = new YopmailBrowserClient(yopmailPage, env.testEmail);

        const inviteMail = await waitForEmailWithFallback(yopmailApi, browserClient, {
          bodyContains: 'marcombox',
          since: guestLinkTimestamp ?? new Date(0),
          timeoutMs: 120_000,
        });
        expect(inviteMail.link).toBeTruthy();
        await yopmailPage.close();

        const guestPage = await context.newPage();
        const guestUpload = new GuestUploadPage(guestPage);
        await guestUpload.openLink(inviteMail.link!);

        const otpTimestamp = new Date();
        const otpYopmailPage = await context.newPage();
        const otpBrowserClient = new YopmailBrowserClient(otpYopmailPage, env.testEmail);
        const otpMail = await waitForEmailWithFallback(yopmailApi, otpBrowserClient, {
          bodyMatches: /\b\d{4,8}\b/,
          since: otpTimestamp,
          timeoutMs: 120_000,
        });
        const otp = extractOtpFromEmailBody(otpMail.body);
        await guestUpload.enterOtp(otp);
        await otpYopmailPage.close();

        await guestUpload.uploadFile(uniqueImage);
        await guestPage.close();
      });

      await steps.run('Step 8: Verify jpg uploaded in DAM folder', async () => {
        await page.bringToFront();
        await assetsPage.navigateToAssets();
        await assetsPage.openUserFolder(USER_FOLDER);
        await assetsPage.verifyAssetExists(imageStem);
      });

      await steps.run('Cleanup: Delete uploaded asset and logout', async () => {
        await assetsPage.deleteAsset(imageStem);
        await assetsPage.confirmAssetNotVisible(imageStem);
        await loginPage.logout();
      });

      steps.assertAllPassed();
    } finally {
      if (fs.existsSync(uniqueImage)) fs.unlinkSync(uniqueImage);
    }
  });
});
