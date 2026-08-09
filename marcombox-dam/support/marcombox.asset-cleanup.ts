import { Page } from '@playwright/test';
import { isMarcomboxAutomationAsset } from './marcombox.asset-prefixes';
import { MarcomboxAssetsPage } from '../pages/marcombox-assets.page';

export async function cleanupMarcomboxAutomationAssets(
  page: Page,
  folderName: string,
  identifiers: string[],
): Promise<void> {
  const assetsPage = new MarcomboxAssetsPage(page);
  await assetsPage.navigateToAssets();
  await assetsPage.openUserFolder(folderName);

  for (const id of identifiers) {
    if (!isMarcomboxAutomationAsset(id)) continue;
    await assetsPage.deleteAssetIfVisible(id);
  }
}

/** Remove leftover automation assets in a folder (prefix-based, non-destructive to manual data). */
export async function cleanupMarcomboxAutomationAssetsInFolder(
  page: Page,
  folderName: string,
): Promise<void> {
  const assetsPage = new MarcomboxAssetsPage(page);
  await assetsPage.navigateToAssets();
  await assetsPage.openUserFolder(folderName);

  const names = await assetsPage.listAssetNames();
  for (const name of names) {
    if (isMarcomboxAutomationAsset(name)) {
      await assetsPage.deleteAssetIfVisible(name);
    }
  }
}
