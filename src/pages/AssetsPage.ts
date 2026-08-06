import { Locator, Page, expect } from '@playwright/test';
import path from 'path';

export class AssetsPage {
  constructor(private readonly page: Page) {}

  async navigateToAssets(): Promise<void> {
    await this.page.getByRole('button', { name: 'DAM' }).click();
    await this.page.getByRole('menuitem', { name: 'Assets' }).click();
    await this.page.waitForSelector('[role="treeitem"]', { timeout: 60_000 });
  }

  async openUserFolder(folderName: string): Promise<void> {
    await this.page
      .locator('[role="group"]')
      .filter({ hasText: folderName })
      .filter({ hasText: 'subfolders' })
      .dblclick();
    await expect(this.page.getByRole('navigation', { name: 'breadcrumb' }).filter({ hasText: folderName })).toBeVisible();
  }

  async clickNewItem(): Promise<void> {
    await this.page.getByRole('button', { name: 'New Item' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Upload files' })).toBeVisible();
  }

  async uploadFile(filePath: string): Promise<void> {
    const absolutePath = path.resolve(filePath);
    await this.page.locator('input[type="file"]._s_fileUpload').setInputFiles(absolutePath);
    await this.page.waitForTimeout(3000);
  }

  async uploadFileViaDragDrop(filePath: string): Promise<void> {
    await this.uploadFile(filePath);
  }

  async searchAsset(query: string): Promise<void> {
    const searchBox = this.page.getByRole('textbox', { name: 'Search' });
    await searchBox.clear();
    if (query) {
      await searchBox.fill(query);
      await this.page.getByRole('button', { name: 'Search' }).click();
    } else {
      await this.page.getByRole('button', { name: 'Clear' }).click().catch(() => searchBox.fill(''));
    }
    await this.page.waitForTimeout(2000);
  }

  getAssetCard(identifier: string): Locator {
    return this.page.locator('[role="group"]').filter({ hasText: identifier }).first();
  }

  async waitForAsset(identifier: string, timeoutMs = 120_000): Promise<void> {
    await expect(this.getAssetCard(identifier)).toBeVisible({ timeout: timeoutMs });
  }

  async openAsset(...identifiers: string[]): Promise<void> {
    for (const id of identifiers) {
      const card = this.getAssetCard(id);
      if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
        await card.click();
        await this.page.waitForTimeout(2000);
        return;
      }
    }
    await this.page.locator('[role="group"]').filter({ hasNotText: 'subfolders' }).last().click();
    await this.page.waitForTimeout(2000);
  }

  async hoverAsset(identifier: string): Promise<void> {
    await this.getAssetCard(identifier).hover();
    await this.page.waitForTimeout(500);
  }

  async openAssetContextMenu(identifier: string): Promise<void> {
    await this.hoverAsset(identifier);
    const card = this.getAssetCard(identifier);
    const menuBtn = card.locator('button').last();
    await menuBtn.click();
  }

  async downloadAsset(identifier: string): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 60_000 });
    await this.openAssetContextMenu(identifier);
    await this.page.getByRole('menuitem', { name: /download/i }).or(this.page.getByText('Download', { exact: true })).first().click();
    const download = await downloadPromise;
    return download.suggestedFilename();
  }

  async shareAsset(identifier: string, email: string): Promise<void> {
    await this.openAssetContextMenu(identifier);
    await this.page.getByRole('menuitem', { name: /share/i }).or(this.page.getByText('Share', { exact: true })).first().click();

    const dialog = this.page.getByRole('dialog').last();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.locator('input[type="email"], input[type="text"]').first().fill(email);
    await dialog.getByRole('button', { name: /send/i }).click();
    await this.page.waitForTimeout(2000);
  }

  async deleteAsset(identifier: string): Promise<void> {
    await this.openAssetContextMenu(identifier);
    await this.page.getByRole('menuitem', { name: /delete/i }).or(this.page.getByText('Delete', { exact: true })).first().click();

    const confirmBtn = this.page.getByRole('button', { name: /confirm|yes|delete/i }).last();
    if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await this.page.waitForTimeout(2000);
  }

  async confirmAssetNotVisible(identifier: string): Promise<void> {
    await expect(this.getAssetCard(identifier)).not.toBeVisible({ timeout: 15_000 });
  }

  async enableEditMode(): Promise<void> {
    await this.page.getByRole('button', { name: /Enable edit mode/i }).click();
    await this.page.waitForTimeout(1000);
  }

  async rightClickFolder(folderName: string): Promise<void> {
    await this.page.locator('[role="treeitem"]').filter({ hasText: folderName }).click({ button: 'right' });
    await this.page.waitForTimeout(500);
  }

  async clickGuestUploadShare(): Promise<void> {
    await this.page.getByText(/Guest upload\/share/i).click();
  }

  async sendGuestUploadInvite(email: string): Promise<void> {
    const dialog = this.page.getByRole('dialog').last();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.locator('input[type="email"], input[type="text"]').first().fill(email);
    await dialog.getByRole('button', { name: /send/i }).click();
    await this.page.waitForTimeout(2000);
  }

  async verifyAssetExists(fileNameStem: string): Promise<void> {
    await expect(this.page.locator('[role="group"]').filter({ hasText: fileNameStem }).first()).toBeVisible({ timeout: 60_000 });
  }
}
