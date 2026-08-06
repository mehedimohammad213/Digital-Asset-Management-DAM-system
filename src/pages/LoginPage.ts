import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/');
    await this.page.locator('input[type="text"], input:not([type="password"])').first().fill(email);
    await this.page.getByRole('button', { name: 'Next' }).click();
    await this.page.waitForURL(/MarcomboxLogin/);
    await this.page.locator('input[type="password"]').fill(password);
    await this.page.getByRole('button', { name: 'Log in' }).click();
    await this.page.waitForURL(/home/);
  }

  async logout(): Promise<void> {
    const profileMenu = this.page
      .getByRole('button')
      .filter({ has: this.page.locator('span, div').filter({ hasText: /^[A-Z]$/ }) })
      .first();

    if (await profileMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await profileMenu.click();
    } else {
      await this.page
        .getByRole('button', { name: /^[A-Z]$/ })
        .first()
        .click();
    }

    await this.page.getByRole('listitem', { name: 'Log out' }).click();
    await this.page.waitForURL(/Login/);
  }

  async expectLoginFormVisible(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Next' })).toBeVisible();
  }
}
