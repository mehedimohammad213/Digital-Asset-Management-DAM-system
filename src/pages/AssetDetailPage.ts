import { Page, expect, Locator } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export interface AssetMetadata {
  title: string;
  type: string;
  dateTime: string;
  description: string;
  tags: string[];
  isAutomatedTestdata: boolean;
  hyperlink: string;
}

export class AssetDetailPage {
  constructor(private readonly page: Page) {}

  private uploadDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Upload files' });
  }

  async fillMetadata(data: AssetMetadata): Promise<void> {
    const dialog = this.uploadDialog();
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    const textboxes = dialog.getByRole('textbox');
    await textboxes.nth(0).fill(data.title);

    await this.selectComboboxOption(dialog.getByRole('combobox').first(), data.type);

    await this.setDateTime(textboxes.nth(1));

    await textboxes.nth(2).click();
    await textboxes.nth(2).fill(data.description);
    await expect(textboxes.nth(2)).toHaveValue(data.description);

    const tagsCombo = dialog.getByRole('combobox').nth(1);
    for (const tag of data.tags) {
      await tagsCombo.click();
      await tagsCombo.fill(tag);
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(300);
    }

    if (data.isAutomatedTestdata) {
      await dialog.locator('span.chakra-checkbox__control').nth(2).click({ force: true });
    }

    await textboxes.nth(3).fill(data.hyperlink);
  }

  private async selectComboboxOption(combobox: Locator, value: string): Promise<void> {
    await combobox.click();
    await this.page.waitForTimeout(300);
    await combobox.pressSequentially(value, { delay: 50 });
    await this.page.waitForTimeout(500);
    const option = this.page.getByRole('option', { name: new RegExp(`^${value}$`, 'i') });
    if (await option.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await option.first().click();
    } else {
      await this.page.locator(`text="${value}"`).last().click().catch(async () => {
        await this.page.keyboard.press('ArrowDown');
        await this.page.keyboard.press('Enter');
      });
    }
    await this.page.keyboard.press('Escape');
  }

  private async setDateTime(dateField: Locator): Promise<void> {
    await dateField.click();
    await this.page.waitForTimeout(300);
    const day = new Date().getDate();
    await this.page
      .locator('.react-datepicker__day:not(.react-datepicker__day--outside-month)')
      .filter({ hasText: String(day) })
      .first()
      .click();
    await this.page.keyboard.press('Escape');
  }

  async save(): Promise<void> {
    const dialog = this.uploadDialog();
    await expect(dialog.getByText(/upload issue/i)).not.toBeVisible({ timeout: 5000 }).catch(() => undefined);
    await dialog.getByRole('button', { name: /save|confirm/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 180_000 });
    await this.page.waitForTimeout(2000);
  }

  async verifyMetadata(data: Partial<AssetMetadata> & { fileName?: string }): Promise<void> {
    await this.page.getByText(/item id|title|description|sample\.mp4/i).first().waitFor({ timeout: 15_000 });
    const bodyText = await this.page.locator('body').innerText();
    expect(bodyText).not.toContain('Upload issue');

    if (data.description) expect(bodyText.toLowerCase()).toContain(data.description.toLowerCase().slice(0, 25));
    if (data.hyperlink) expect(bodyText).toContain(data.hyperlink);
  }

  async clickEdit(): Promise<void> {
    await this.page.getByRole('button', { name: /^edit$/i }).click();
    await expect(this.page.getByRole('button', { name: /cancel edit/i })).toBeVisible({ timeout: 15_000 });
  }

  async getItemId(): Promise<string> {
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
    const closeBtn = this.page.getByRole('button', { name: /^close$/i }).first();
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(1000);
  }

  private fieldByLabel(label: string) {
    return this.page
      .locator('p')
      .filter({ hasText: new RegExp(`^${label}$`, 'i') })
      .locator('xpath=..')
      .getByRole('textbox');
  }

  private async setDetailFieldValue(label: string, value: string): Promise<void> {
    const field = this.fieldByLabel(label);
    await field.click();
    await field.fill(value);
  }

  async updateTitle(newTitle: string): Promise<void> {
    await this.setDetailFieldValue('Title', newTitle);
  }

  async updateDescription(newDescription: string): Promise<void> {
    await this.setDetailFieldValue('Description', newDescription);
  }

  async updateDateTime(): Promise<void> {
    await this.setDateTime(this.fieldByLabel('Date Time'));
  }

  async saveEdit(): Promise<void> {
    await this.page.getByRole('button', { name: /save|confirm/i }).click();
    await this.page.waitForTimeout(3000);
  }
}

/** Copy test file to a unique path to avoid duplicate-name upload errors. */
export function uniqueTestFile(sourcePath: string, prefix: string): string {
  const ext = path.extname(sourcePath);
  const uniqueName = `${prefix}-${Date.now()}${ext}`;
  const dest = path.join(path.dirname(sourcePath), uniqueName);
  fs.copyFileSync(sourcePath, dest);
  return dest;
}
