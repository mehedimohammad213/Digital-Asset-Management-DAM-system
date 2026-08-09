import { test, expect } from '@marcombox/fixtures/marcombox.fixture';

test.describe('MarcomBox login @smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('successful login redirects to home @smoke @auth', async ({
    page,
    marcomboxEnv,
    marcomboxLoginPage,
  }) => {
    await marcomboxLoginPage.login(marcomboxEnv.email, marcomboxEnv.password);
    await expect(page).toHaveURL(/home/);
    await expect(page.getByRole('button', { name: 'DAM' })).toBeVisible();
  });

  test('invalid password keeps user on login page @smoke @auth @negative', async ({
    page,
    marcomboxEnv,
  }) => {
    await page.goto('/');
    await page
      .locator('input[type="text"], input:not([type="password"])')
      .first()
      .fill(marcomboxEnv.email);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForURL(/MarcomboxLogin/);
    await page.locator('input[type="password"]').fill('invalid-password-qa-automation');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/MarcomboxLogin|Login/);
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page).not.toHaveURL(/home/);
  });
});
