import { Page, expect, Locator } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export interface MarcomboxAssetMetadata {
  title: string;
  type: string;
  dateTime: string;
  description: string;
  tags: string[];
  isAutomatedTestdata: boolean;
  hyperlink: string;
}

export class MarcomboxAssetDetailPage {
  constructor(private readonly page: Page) {}

  private uploadDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Upload files' });
  }

  async fillMetadata(data: MarcomboxAssetMetadata): Promise<void> {
    const dialog = this.uploadDialog();
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    const textboxes = dialog.getByRole('textbox');
    await textboxes.nth(0).click();
    await textboxes.nth(0).fill(data.title);

    await dialog
      .locator(
        '.css-1lsxwht > ._s_add-user-group > .css-b62m3t-container > .mb-tag-field__control > .mb-tag-field__value-container > .mb-tag-field__input-container',
      )
      .first()
      .click();
    await this.page.getByRole('option', { name: data.type, exact: true }).click();

    await this.pickCurrentDateTime(dialog);

    await textboxes.nth(2).click();
    await textboxes.nth(2).fill(data.description);

    for (const tag of data.tags) {
      const optionName = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
      await dialog
        .locator(
          '.mb-tag-field__value-container.mb-tag-field__value-container--is-multi > .mb-tag-field__input-container',
        )
        .click();
      await this.page.getByRole('option', { name: optionName }).click();
    }

    if (data.isAutomatedTestdata) {
      await dialog.locator('.chakra-checkbox__control.css-15kcd0a').click();
    }

    await dialog.getByText('Hyperlink').click();
    await textboxes.nth(3).click();
    await textboxes.nth(3).fill(data.hyperlink);
  }

  private async pickCurrentDateTime(scope: Locator): Promise<void> {
    const dateField = scope.getByRole('textbox').nth(1);
    await dateField.click();

    const day = new Date().getDate();
    await this.page
      .locator('.react-datepicker__day:not(.react-datepicker__day--outside-month)')
      .filter({ hasText: String(day) })
      .first()
      .click();

    const timeOption = this.page.getByRole('option', { name: /\d+:\d+ [AP]M/i }).first();
    if (await timeOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timeOption.click();
    }
  }

  async save(): Promise<void> {
    const dialog = this.uploadDialog();
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 180_000 });
  }

  async verifyMetadata(
    data: Partial<MarcomboxAssetMetadata> & { fileName?: string; itemId?: string },
  ): Promise<void> {
    await this.page
      .getByRole('paragraph')
      .filter({ hasText: 'Title' })
      .waitFor({ timeout: 15_000 });
    const bodyText = await this.page.locator('body').innerText();

    if (data.title) expect(bodyText).toContain(data.title);
    if (data.type) expect(bodyText).toMatch(new RegExp(data.type, 'i'));
    if (data.description) expect(bodyText).toContain(data.description);
    if (data.hyperlink) expect(bodyText).toContain(data.hyperlink.replace(/\/$/, ''));
    if (data.fileName) expect(bodyText).toContain(data.fileName);
    if (data.itemId) expect(bodyText).toContain(data.itemId);
    if (data.tags) {
      for (const tag of data.tags) {
        expect(bodyText.toLowerCase()).toContain(tag.toLowerCase());
      }
    }
    if (data.isAutomatedTestdata) {
      expect(bodyText).toMatch(/automated testdata|is automated test/i);
    }
  }

  async getAssetType(): Promise<string> {
    const bodyText = await this.page.locator('body').innerText();
    const match = bodyText.match(/Type[:\s]+([A-Za-z]+)/i);
    if (!match) throw new Error('Could not extract asset Type from detail view');
    return match[1];
  }

  async clickEdit(): Promise<void> {
    await this.page.getByRole('button', { name: 'edit' }).click();
    await expect(this.page.getByRole('textbox').first()).toBeVisible({ timeout: 15_000 });
  }

  async getItemId(): Promise<string> {
    await this.page.getByRole('paragraph').filter({ hasText: 'Title' }).click();
    await this.page.getByRole('button', { name: 'copy' }).click();

    const bodyText = await this.page.locator('body').innerText();
    const patterns = [
      /Item\s*ID[:\s]+([A-Za-z0-9-]+)/i,
      /ID[:\s]+([0-9a-f]{24})/i,
      /\b([0-9a-f]{24})\b/,
    ];
    for (const pattern of patterns) {
      const match = bodyText.match(pattern);
      if (match) return match[1];
    }
    throw new Error('Could not extract item ID from asset detail view');
  }

  async close(): Promise<void> {
    await this.page.getByRole('button', { name: 'close' }).nth(1).click();
    await expect(this.page.getByRole('paragraph').filter({ hasText: 'Title' }))
      .not.toBeVisible({ timeout: 5000 })
      .catch(() => undefined);
  }

  async updateTitle(newTitle: string): Promise<void> {
    await this.page.getByRole('textbox').first().fill(newTitle);
  }

  async updateDescription(newDescription: string): Promise<void> {
    await this.page.getByRole('textbox').nth(2).fill(newDescription);
  }

  async updateDateTime(): Promise<void> {
    await this.pickCurrentDateTime(this.page.locator('body'));
  }

  async saveEdit(): Promise<void> {
    await this.page.getByRole('button', { name: /save|confirm/i }).click();
    await expect(this.page.getByRole('button', { name: 'edit' })).toBeVisible({
      timeout: 15_000,
    });
  }
}

/** Copy test file to a unique path to avoid duplicate-name upload errors. */
export function uniqueMarcomboxTestFile(sourcePath: string, prefix: string): string {
  const ext = path.extname(sourcePath);
  const uniqueName = `${prefix}-${Date.now()}${ext}`;
  const dest = path.join(path.dirname(sourcePath), uniqueName);
  fs.copyFileSync(sourcePath, dest);
  return dest;
}
