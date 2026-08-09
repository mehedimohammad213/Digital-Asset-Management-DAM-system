import { Page, expect } from '@playwright/test';

export class MarcomboxLoginPage {
  constructor(private readonly page: Page) {}

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/');
    await this.page.getByRole('textbox').click();
    await this.page.getByRole('textbox').fill(email);
    await this.page.getByRole('button', { name: 'Next' }).click();
    await this.page.waitForURL(/MarcomboxLogin/);
    await this.page.getByRole('textbox').click();
    await this.page.getByRole('textbox').fill(password);
    await this.page.getByRole('button', { name: 'Log in' }).click();
    await this.page.waitForURL(/home/);
  }

  async logout(): Promise<void> {
    const profileBtn = this.page.getByRole('button', { name: /^[A-Z]$/, description: /.+/ });
    if (await profileBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await profileBtn.click();
    } else {
      await this.page
        .getByRole('button', { name: /^[A-Z]$/ })
        .first()
        .click();
    }

    await this.page.getByRole('menuitem', { name: /log out/i }).click();
    await this.page.waitForURL(/Login/);
  }

  async expectLoginFormVisible(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Next' })).toBeVisible();
  }
}
