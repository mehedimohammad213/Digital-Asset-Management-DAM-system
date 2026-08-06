import { Page } from '@playwright/test';
import { AssetsPage } from '../pages/AssetsPage';
import { LoginPage } from '../pages/LoginPage';

export async function cleanupAutomationAssets(
  page: Page,
  folderName: string,
  identifiers: string[],
): Promise<void> {
  const assetsPage = new AssetsPage(page);
  await assetsPage.navigateToAssets();
  await assetsPage.openUserFolder(folderName);

  for (const id of identifiers) {
    const card = page.locator('[role="group"]').filter({ hasText: id });
    if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
      await assetsPage.deleteAsset(id);
    }
  }
}

export async function ensureLoggedIn(page: Page, email: string, password: string): Promise<void> {
  if (!page.url().includes('Login')) return;
  await new LoginPage(page).login(email, password);
}
