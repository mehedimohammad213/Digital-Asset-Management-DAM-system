import { Locator, Page, expect } from '@playwright/test';
import path from 'path';

export class AssetsPage {
  constructor(private readonly page: Page) {}

  async navigateToAssets(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'DAM' })).toBeVisible({ timeout: 60_000 });
    await this.page.getByRole('button', { name: 'DAM' }).click();
    await this.page.getByRole('menuitem', { name: 'Assets' }).click();
    await this.page.waitForSelector('[role="treeitem"]', { timeout: 60_000 });
  }

  async openUserFolder(folderName: string): Promise<void> {
    const newItemButton = this.page.getByRole('button', { name: 'New Item' });
    if (await newItemButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      return;
    }

    const folderCard = this.page
      .locator('[role="group"]')
      .filter({ hasText: folderName })
      .filter({ hasText: /files|subfolders/i })
      .first();

    if (await folderCard.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await folderCard.dblclick();
    } else {
      await this.page
        .locator('[role="treeitem"]')
        .filter({ hasText: folderName })
        .first()
        .dblclick();
    }

    await expect(newItemButton).toBeVisible({ timeout: 30_000 });
  }

  async clickNewItem(): Promise<void> {
    await this.page.getByRole('button', { name: 'New Item' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Upload files' })).toBeVisible();
  }

  async uploadFile(filePath: string): Promise<void> {
    const absolutePath = path.resolve(filePath);
    const dialog = this.page.getByRole('dialog', { name: 'Upload files' });
    await this.page.locator('input[type="file"]').first().setInputFiles(absolutePath);
    await expect(dialog.getByText(/sample\.|uploading|processing|mp4|ready/i).first()).toBeVisible({
      timeout: 60_000,
    });
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

  /** Poll search until the index returns results (video metadata indexing can lag). */
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

  getAssetCard(identifier: string): Locator {
    return this.page.locator('[role="group"]').filter({ hasText: identifier }).first();
  }

  async waitForAsset(identifier: string, timeoutMs = 120_000): Promise<void> {
    await expect(this.getAssetCard(identifier)).toBeVisible({ timeout: timeoutMs });
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

  /** Locate asset card by opening detail panels until a matcher hits (search index may lag). */
  async findAssetCardByDetailMatch(matchers: string[]): Promise<Locator> {
    await this.searchAsset('');

    const cards = this.page.locator('[role="group"]').filter({ hasNotText: 'subfolders' });
    const count = await cards.count();

    for (let i = count - 1; i >= 0; i--) {
      const card = cards.nth(i);
      await card.click();
      const body = await this.page.locator('body').innerText();

      if (matchers.some((matcher) => body.includes(matcher))) {
        await this.page.keyboard.press('Escape');
        await expect(this.page.getByText(/item id/i))
          .not.toBeVisible({ timeout: 5000 })
          .catch(() => undefined);
        return card;
      }

      await this.page.keyboard.press('Escape');
    }

    throw new Error(`Asset card not found matching: ${matchers.join(', ')}`);
  }

  async openAsset(...identifiers: string[]): Promise<void> {
    for (const id of identifiers) {
      const card = this.getAssetCard(id);
      if (await card.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await card.click();
        await expect(this.page.getByText(/item id|title|description/i).first()).toBeVisible({
          timeout: 15_000,
        });
        return;
      }
    }

    throw new Error(`Asset not found for identifiers: ${identifiers.join(', ')}`);
  }

  /** Open asset by scanning cards and matching detail-panel identity (search index may lag). */
  async openAssetByDetailMatch(matchers: string[], timeoutMs = 120_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      try {
        const card = await this.findAssetCardByDetailMatch(matchers);
        await card.click();
        await expect(this.page.getByText(/item id|title|description/i).first()).toBeVisible({
          timeout: 15_000,
        });
        return;
      } catch {
        await this.page.waitForTimeout(5000);
      }
    }

    throw new Error(`Asset not found matching: ${matchers.join(', ')}`);
  }

  async downloadAssetByDetailMatch(matchers: string[]): Promise<string> {
    const card = await this.findAssetCardByDetailMatch(matchers);
    const downloadPromise = this.page.waitForEvent('download', { timeout: 60_000 });
    await card.hover();
    await card.locator('button').last().click();
    await this.page
      .getByRole('menuitem', { name: /download/i })
      .or(this.page.getByText('Download', { exact: true }))
      .first()
      .click();
    const download = await downloadPromise;
    return download.suggestedFilename();
  }

  async shareAssetByDetailMatch(matchers: string[], email: string): Promise<void> {
    const card = await this.findAssetCardByDetailMatch(matchers);
    await card.hover();
    await card.locator('button').last().click();
    await this.page
      .getByRole('menuitem', { name: /share/i })
      .or(this.page.getByText('Share', { exact: true }))
      .first()
      .click();

    const dialog = this.page.getByRole('dialog').last();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.locator('input[type="email"], input[type="text"]').first().fill(email);
    await dialog.getByRole('button', { name: /send/i }).click();
    await expect(dialog)
      .not.toBeVisible({ timeout: 15_000 })
      .catch(() => undefined);
  }

  async deleteAssetByDetailMatch(matchers: string[]): Promise<void> {
    const card = await this.findAssetCardByDetailMatch(matchers);
    await card.hover();
    await card.locator('button').last().click();
    await this.page
      .getByRole('menuitem', { name: /delete/i })
      .or(this.page.getByText('Delete', { exact: true }))
      .first()
      .click();

    const confirmBtn = this.page.getByRole('button', { name: /confirm|yes|delete/i }).last();
    if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(card).not.toBeVisible({ timeout: 15_000 });
  }

  async hoverAsset(identifier: string): Promise<void> {
    await this.getAssetCard(identifier).hover();
  }

  async openAssetContextMenu(identifier: string): Promise<void> {
    await this.hoverAsset(identifier);
    const card = this.getAssetCard(identifier);
    await card.locator('button').last().click();
    await expect(this.page.getByRole('menuitem').first()).toBeVisible({ timeout: 5000 });
  }

  async downloadAsset(identifier: string): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 60_000 });
    await this.openAssetContextMenu(identifier);
    await this.page
      .getByRole('menuitem', { name: /download/i })
      .or(this.page.getByText('Download', { exact: true }))
      .first()
      .click();
    const download = await downloadPromise;
    return download.suggestedFilename();
  }

  async shareAsset(identifier: string, email: string): Promise<void> {
    await this.openAssetContextMenu(identifier);
    await this.page
      .getByRole('menuitem', { name: /share/i })
      .or(this.page.getByText('Share', { exact: true }))
      .first()
      .click();

    const dialog = this.page.getByRole('dialog').last();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.locator('input[type="email"], input[type="text"]').first().fill(email);
    await dialog.getByRole('button', { name: /send/i }).click();
    await expect(dialog)
      .not.toBeVisible({ timeout: 15_000 })
      .catch(() => undefined);
  }

  async deleteAsset(identifier: string): Promise<void> {
    await this.openAssetContextMenu(identifier);
    await this.page
      .getByRole('menuitem', { name: /delete/i })
      .or(this.page.getByText('Delete', { exact: true }))
      .first()
      .click();

    const confirmBtn = this.page.getByRole('button', { name: /confirm|yes|delete/i }).last();
    if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(this.getAssetCard(identifier)).not.toBeVisible({ timeout: 15_000 });
  }

  async deleteAssetIfVisible(identifier: string): Promise<void> {
    const card = this.getAssetCard(identifier);
    if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.deleteAsset(identifier);
    }
  }

  async confirmAssetNotVisible(identifier: string): Promise<void> {
    await expect(this.getAssetCard(identifier)).not.toBeVisible({ timeout: 15_000 });
  }

  async enableEditMode(): Promise<void> {
    await this.page.getByRole('button', { name: /Enable edit mode/i }).click();
    await expect(this.page.locator('[role="treeitem"]').first()).toBeVisible();
  }

  async rightClickFolder(folderName: string): Promise<void> {
    await this.page
      .locator('[role="treeitem"]')
      .filter({ hasText: folderName })
      .click({ button: 'right' });
    await expect(this.page.getByText(/Guest upload\/share/i)).toBeVisible({ timeout: 5000 });
  }

  async clickGuestUploadShare(): Promise<void> {
    await this.page.getByText(/Guest upload\/share/i).click();
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
