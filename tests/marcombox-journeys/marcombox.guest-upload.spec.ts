import path from 'path';
import fs from 'fs';
import { test, expect } from '@marcombox/fixtures/marcombox.fixture';
import { uniqueMarcomboxTestFile } from '@marcombox/pages/marcombox-asset-detail.page';
import { extractOtpFromEmailBody, waitForMarcomboxEmail } from '@marcombox/support/marcombox.email';
import { MarcomboxStepRunner } from '@marcombox/support/marcombox.step-runner';
import {
  uniqueMarcomboxTestId,
  MARCOMBOX_GUEST_UPLOAD_PREFIX,
} from '@marcombox/support/marcombox.test-data';
import { MarcomboxYopmailBrowserClient } from '@marcombox/support/marcombox.yopmail';
import { MarcomboxGuestUploadPage } from '@marcombox/pages/marcombox-guest-upload.page';

test.describe('MarcomBox guest upload journey @regression', () => {
  test.describe.configure({ mode: 'serial' });

  test('guest upload jpg via folder share link @regression', async ({
    page,
    context,
    marcomboxEnv,
    marcomboxAssetsPage,
    marcomboxLoginPage,
    marcomboxYopmailApi,
  }) => {
    const steps = new MarcomboxStepRunner(page);

    const testIdentity = uniqueMarcomboxTestId(MARCOMBOX_GUEST_UPLOAD_PREFIX);
    const sourceImage = path.join(__dirname, '../../test-data/marcombox/sample.jpg');
    const uniqueImage = uniqueMarcomboxTestFile(sourceImage, `automation-image-${testIdentity}`);
    const imageStem = path.parse(uniqueImage).name;

    let guestLinkTimestamp: Date | undefined;

    try {
      await steps.run('Step 1: Sign in, go to DAM > Assets, and open user folder', async () => {
        await marcomboxAssetsPage.navigateToAssets();
        await marcomboxAssetsPage.openUserFolder(marcomboxEnv.folderName);
      });

      await steps.run(
        'Step 2-4: Enable edit mode, guest upload invite, and send email',
        async () => {
          await marcomboxAssetsPage.enableEditMode();
          await marcomboxAssetsPage.rightClickFolder(marcomboxEnv.folderName);
          await marcomboxAssetsPage.clickGuestUploadShare();
          guestLinkTimestamp = new Date();
          await marcomboxAssetsPage.sendGuestUploadInvite(marcomboxEnv.testEmail);
        },
      );

      await steps.run('Step 5-7: Open guest link, verify OTP, and upload jpg', async () => {
        const yopmailPage = await context.newPage();
        const browserClient = new MarcomboxYopmailBrowserClient(
          yopmailPage,
          marcomboxEnv.testEmail,
        );

        const inviteMail = await waitForMarcomboxEmail(marcomboxYopmailApi, browserClient, {
          bodyContains: 'marcombox',
          since: guestLinkTimestamp ?? new Date(0),
          timeoutMs: 120_000,
        });
        expect(inviteMail.link).toBeTruthy();
        await yopmailPage.close();

        const guestPage = await context.newPage();
        const guestUpload = new MarcomboxGuestUploadPage(guestPage);
        await guestUpload.openLink(inviteMail.link!);

        const otpTimestamp = new Date();
        const otpYopmailPage = await context.newPage();
        const otpBrowserClient = new MarcomboxYopmailBrowserClient(
          otpYopmailPage,
          marcomboxEnv.testEmail,
        );
        const otpMail = await waitForMarcomboxEmail(marcomboxYopmailApi, otpBrowserClient, {
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
        await marcomboxAssetsPage.navigateToAssets();
        await marcomboxAssetsPage.openUserFolder(marcomboxEnv.folderName);
        await marcomboxAssetsPage.verifyAssetExists(imageStem);
      });

      await steps.run('Cleanup: Delete uploaded asset and logout', async () => {
        await marcomboxAssetsPage.deleteAsset(imageStem);
        await marcomboxAssetsPage.confirmAssetNotVisible(imageStem);
        await marcomboxLoginPage.logout();
      });

      steps.assertAllPassed();
    } finally {
      if (fs.existsSync(uniqueImage)) fs.unlinkSync(uniqueImage);
    }
  });
});
