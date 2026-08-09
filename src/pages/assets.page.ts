import { Page, expect } from '@playwright/test';
import path from 'path';

export class AssetsPage {
  constructor(private readonly page: Page) {}

  async navigateToAssets(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'DAM' })).toBeVisible({ timeout: 60_000 });
    await this.page.getByRole('button', { name: 'DAM' }).click();
    await this.page.getByRole('menuitem', { name: 'Assets' }).click();
    await this.page.waitForSelector('#scrollableDiv', { timeout: 60_000 });
  }

  async openUserFolder(folderName: string): Promise<void> {
    const alreadyOpen = this.page
      .locator('navigation[breadcrumb]')
      .filter({ hasText: folderName })
      .last();
    if (await alreadyOpen.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(this.page.getByRole('button', { name: 'New Item' })).toBeVisible({
        timeout: 10_000,
      });
      return;
    }

    const treeFolder = this.page.getByRole('treeitem', { name: folderName, exact: true });
    if (await treeFolder.isVisible({ timeout: 5000 }).catch(() => false)) {
      await treeFolder.dblclick();
      await expect(this.page.getByRole('button', { name: 'New Item' })).toBeVisible({
        timeout: 30_000,
      });
      return;
    }

    await this.page
      .locator('div')
      .filter({ hasText: /^Folder$/ })
      .nth(3)
      .click();

    const folderLabel = this.page.locator('#scrollableDiv').getByText(folderName, { exact: true });
    if (await folderLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await folderLabel.click();
    } else {
      await this.page.locator('#scrollableDiv').getByRole('img').click();
    }

    await expect(this.page.getByRole('button', { name: 'New Item' })).toBeVisible({
      timeout: 30_000,
    });
  }

  async clickNewItem(): Promise<void> {
    await this.page.getByRole('button', { name: 'New Item' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Upload files' })).toBeVisible({
      timeout: 15_000,
    });
  }

  async uploadFile(filePath: string): Promise<void> {
    const absolutePath = path.resolve(filePath);
    const dialog = this.page.getByRole('dialog', { name: 'Upload files' });
    await dialog.getByRole('img').first().click();
    await dialog.locator('input[type="file"]').first().setInputFiles(absolutePath);
    await expect(dialog.getByText(/mp4|uploading|processing|ready/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await this.page.waitForTimeout(15_000);
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
      await expect(
        this.page.getByText(/\d+ items|\d+ search results|no items found/i).first(),
      ).toBeVisible({ timeout: 30_000 });
    } else {
      await this.page
        .getByRole('button', { name: 'Clear' })
        .click()
        .catch(() => searchBox.fill(''));
    }
  }

  async searchUntilResults(query: string, timeoutMs = 180_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await this.searchAsset(query);
      const noResults = await this.page
        .getByText(/no items found/i)
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (!noResults) return;
      await this.page.waitForTimeout(5000);
    }

    throw new Error(`Search returned no results for "${query}" within ${timeoutMs}ms`);
  }

  async openAssetFromSearch(query: string, timeoutMs = 180_000): Promise<void> {
    await this.searchUntilResults(query, timeoutMs);
    await this.openAssetByTitle(query);
  }

  async openAssetByTitle(title: string): Promise<void> {
    await this.page
      .locator('div')
      .filter({ hasText: new RegExp(`^${title}$`) })
      .nth(2)
      .click();
    await expect(this.page.getByRole('paragraph').filter({ hasText: 'Title' })).toBeVisible({
      timeout: 15_000,
    });
  }

  async selectAssetByTitle(title: string): Promise<void> {
    await this.openAssetByTitle(title);
    await this.closeDetailIfOpen();
    await this.page.locator('.chakra-checkbox__control').first().click();
    await this.page.locator('.css-17zthjx').click();
  }

  private async closeDetailIfOpen(): Promise<void> {
    const closeBtn = this.page.getByRole('button', { name: 'close' }).nth(1);
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }
  }

  async downloadSelectedAsset(): Promise<string> {
    await this.page.locator('.chakra-checkbox__control').first().click();
    await this.page.locator('.css-17zthjx').click();

    const downloadPromise = this.page.waitForEvent('download', { timeout: 60_000 });
    await this.page.getByRole('button', { name: 'download' }).click();
    const download = await downloadPromise;
    return download.suggestedFilename();
  }

  async downloadAssetFromMenu(title: string): Promise<string> {
    await this.selectAssetRow(title);
    const downloadPromise = this.page.waitForEvent('download', { timeout: 60_000 });
    await this.openAssetMenu();
    await this.page.getByRole('menuitem', { name: 'Download' }).click();
    const download = await downloadPromise;
    return download.suggestedFilename();
  }

  async shareAssetViaEmailLink(title: string, email: string): Promise<void> {
    await this.selectAssetRow(title);
    await this.openAssetMenu();
    await this.page.getByRole('menuitem', { name: 'Share' }).click();
    await this.page.locator('.mb-tag-field__input-container').click();
    await this.page.locator('[id^="react-select-"][id$="-input"]').fill(email);
    await this.page.locator('[id^="react-select-"][id$="-input"]').press('Enter');
    await this.page.getByRole('button', { name: 'Email Link' }).click();
  }

  async deleteSelectedAsset(): Promise<void> {
    await this.page.locator('.chakra-checkbox__control').first().click();
    await this.page.getByRole('button', { name: 'delete' }).click();
    await this.page.getByRole('button', { name: 'Confirm' }).click();
  }

  async deleteAssetByTitle(title: string): Promise<void> {
    await this.selectAssetRow(title);
    await this.page.getByRole('button', { name: 'delete' }).click();
    await this.page.getByRole('button', { name: 'Confirm' }).click();
    await expect(
      this.page.locator('div').filter({ hasText: new RegExp(`^${title}$`) }),
    ).not.toBeVisible({ timeout: 15_000 });
  }

  private async selectAssetRow(title: string): Promise<void> {
    await this.closeDetailIfOpen();
    await this.page.locator('.chakra-checkbox__control').first().click();
    await this.page
      .locator('div')
      .filter({ hasText: new RegExp(`^${title}$`) })
      .nth(2)
      .click();
  }

  private async openAssetMenu(): Promise<void> {
    await this.page.locator('[id^="menu-button-"]').last().click();
  }

  async confirmSearchHasNoResults(query: string): Promise<void> {
    await this.searchAsset(query);
    await expect(this.page.getByText(/no items found/i).first()).toBeVisible({ timeout: 30_000 });
  }

  async listAssetNames(): Promise<string[]> {
    const cards = this.page.locator('[role="group"]').filter({ hasNotText: 'subfolders' });
    const count = await cards.count();
    const names: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = (await cards.nth(i).innerText()).trim();
      if (text) names.push(text.split('\n')[0]);
    }

    return names;
  }

  async deleteAssetIfVisible(identifier: string): Promise<void> {
    const card = this.page.locator('div').filter({ hasText: identifier }).first();
    if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.deleteAssetByTitle(identifier);
    }
  }

  async deleteAsset(identifier: string): Promise<void> {
    await this.deleteAssetByTitle(identifier);
  }

  async confirmAssetNotVisible(identifier: string): Promise<void> {
    await expect(this.page.locator('div').filter({ hasText: identifier }).first()).not.toBeVisible({
      timeout: 15_000,
    });
  }

  async enableEditMode(): Promise<void> {
    const editModeBtn = this.page.getByRole('button', {
      name: 'Enable edit mode. Right click on a folder for options',
    });
    await expect(editModeBtn).toBeVisible({ timeout: 15_000 });
    await editModeBtn.click({ force: true });
    await this.page.waitForTimeout(1500);
  }

  async rightClickFolder(folderName: string): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);

    const folderTreeItem = this.page
      .locator('[role="tree"]')
      .getByRole('treeitem', { name: folderName, exact: true });

    await folderTreeItem.scrollIntoViewIfNeeded();
    const box = await folderTreeItem.boundingBox();
    if (!box) throw new Error(`Folder "${folderName}" not found in tree panel`);

    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
    await this.page.waitForTimeout(500);
  }

  async clickGuestUploadShare(): Promise<void> {
    const guestMenuItem = this.page
      .locator('[role="menuitem"]')
      .filter({ hasText: /Guest upload/i })
      .last();

    await expect(guestMenuItem).toBeAttached({ timeout: 10_000 });
    if (await guestMenuItem.isVisible()) {
      await guestMenuItem.click();
    } else {
      await guestMenuItem.click({ force: true });
    }
  }

  async sendGuestUploadInvite(email: string): Promise<void> {
    const dialog = this.page.getByRole('dialog').last();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.locator('input[type="email"], input[type="text"]').first().fill(email);
    await dialog.getByRole('button', { name: /send/i }).click();
    await expect(dialog)
      .not.toBeVisible({ timeout: 15_000 })
      .catch(() => undefined);
  }

  async verifyAssetExists(fileNameStem: string): Promise<void> {
    await expect(
      this.page.locator('[role="group"]').filter({ hasText: fileNameStem }).first(),
    ).toBeVisible({ timeout: 60_000 });
  }
}
