import { Page } from '@playwright/test';
import { isAutomationAsset } from './constants';
import { AssetsPage } from '../pages/AssetsPage';

export async function cleanupAutomationAssets(
  page: Page,
  folderName: string,
  identifiers: string[],
): Promise<void> {
  const assetsPage = new AssetsPage(page);
  await assetsPage.navigateToAssets();
  await assetsPage.openUserFolder(folderName);

  for (const id of identifiers) {
    if (!isAutomationAsset(id)) continue;
    await assetsPage.deleteAssetIfVisible(id);
  }
}

/** Remove leftover automation assets in a folder (prefix-based, non-destructive to manual data). */
export async function cleanupAutomationAssetsInFolder(
  page: Page,
  folderName: string,
): Promise<void> {
  const assetsPage = new AssetsPage(page);
  await assetsPage.navigateToAssets();
  await assetsPage.openUserFolder(folderName);

  const names = await assetsPage.listAssetNames();
  for (const name of names) {
    if (isAutomationAsset(name)) {
      await assetsPage.deleteAssetIfVisible(name);
    }
  }
}
