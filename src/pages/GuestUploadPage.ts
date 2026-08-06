import { Page, expect } from '@playwright/test';
import path from 'path';

export class GuestUploadPage {
  constructor(private readonly page: Page) {}

  async openLink(url: string): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async enterOtp(otp: string): Promise<void> {
    const otpInput = this.page.locator('input[type="text"], input[type="number"], input[type="tel"], input[placeholder*="OTP"], input[placeholder*="code"]').first();
    await expect(otpInput).toBeVisible({ timeout: 30_000 });
    await otpInput.fill(otp);
    await this.page.getByRole('button', { name: /verify/i }).click();
    await this.page.waitForTimeout(2000);
  }

  async uploadFile(filePath: string): Promise<void> {
    const absolutePath = path.resolve(filePath);

    const browseBtn = this.page.getByRole('button', { name: /Browse Files/i }).or(
      this.page.getByText('Browse Files'),
    );
    if (await browseBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const [fileChooser] = await Promise.all([
        this.page.waitForEvent('filechooser'),
        browseBtn.click(),
      ]);
      await fileChooser.setFiles(absolutePath);
    } else {
      await this.page.locator('input[type="file"]').setInputFiles(absolutePath);
    }

    await this.page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('uploaded') || text.includes('success') || !text.includes('uploading');
      },
      { timeout: 120_000 },
    );
  }
}
