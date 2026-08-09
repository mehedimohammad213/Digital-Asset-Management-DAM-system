import { Given, When, Then, expect } from '@src/fixtures/bdd.fixture';

Given('I am on the login page', async ({ page }) => {
  await page.goto('/');
});

When('I sign in with valid credentials', async ({ loginPage, env }) => {
  await loginPage.login(env.email, env.password);
});

When('I sign in with an invalid password', async ({ page, env }) => {
  await page.locator('input[type="text"], input:not([type="password"])').first().fill(env.email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForURL(/MarcomboxLogin/);
  await page.locator('input[type="password"]').fill('invalid-password-qa-automation');
  await page.getByRole('button', { name: 'Log in' }).click();
});

Then('I should see the DAM home page', async ({ page }) => {
  await expect(page).toHaveURL(/home/);
  await expect(page.getByRole('button', { name: 'DAM' })).toBeVisible();
});

Then('I should remain on the login page', async ({ page }) => {
  await expect(page).toHaveURL(/MarcomboxLogin|Login/);
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page).not.toHaveURL(/home/);
});
