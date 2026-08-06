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
    await this.page.getByRole('button', { name: /^M$/ }).click();
    await this.page.getByRole('listitem', { name: 'Log out' }).click();
    await this.page.waitForURL(/Login/);
  }
}
