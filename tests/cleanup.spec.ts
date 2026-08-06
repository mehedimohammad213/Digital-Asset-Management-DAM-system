import { test } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { AssetsPage } from '../src/pages/AssetsPage';

test('cleanup leftover test assets', async ({ page }) => {
  test.setTimeout(120_000);
  const email = process.env.MARCOMBOX_EMAIL!;
  const password = process.env.MARCOMBOX_PASSWORD!;
  const folderName = process.env.USER_FOLDER_NAME || 'mehedi';

  await new LoginPage(page).login(email, password);
  const assetsPage = new AssetsPage(page);
  await assetsPage.navigateToAssets();
  await assetsPage.openUserFolder(folderName);

  const groups = page.locator('[role="group"]').filter({ hasNotText: 'subfolders' });
  const count = await groups.count();
  console.log('Assets in folder:', count);

  for (let i = count - 1; i >= 0; i--) {
    const text = await groups.nth(i).innerText();
    console.log('Deleting:', text.substring(0, 80));
    await groups.nth(i).hover();
    await groups.nth(i).locator('button').last().click().catch(() => undefined);
    const deleteBtn = page.getByRole('menuitem', { name: /delete/i }).or(page.getByText('Delete', { exact: true }));
    if (await deleteBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.first().click();
      const confirm = page.getByRole('button', { name: /confirm|yes|delete/i }).last();
      if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) await confirm.click();
      await page.waitForTimeout(2000);
    } else {
      await page.keyboard.press('Escape');
    }
  }
});
