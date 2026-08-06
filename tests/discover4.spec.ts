import { test, expect } from '@playwright/test';
import path from 'path';
import { formatDateTime } from '../src/helpers/dateTime';

const email = process.env.MARCOMBOX_EMAIL!;
const password = process.env.MARCOMBOX_PASSWORD!;

test('discover upload in mehedi folder', async ({ page }) => {
  test.setTimeout(300_000);

  await page.goto('https://qatest.marcombox.com/');
  await page.locator('input[type="text"], input:not([type="password"])').first().fill(email);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.waitForURL(/MarcomboxLogin/);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/home/);

  await page.getByRole('button', { name: 'DAM' }).click();
  await page.getByRole('menuitem', { name: 'Assets' }).click();
  await page.waitForSelector('[role="treeitem"]', { timeout: 60_000 });

  await page
    .locator('[role="group"]')
    .filter({ hasText: 'mehedi' })
    .filter({ hasText: 'subfolders' })
    .dblclick();
  await page.waitForTimeout(3000);
  await expect(
    page.getByRole('navigation', { name: 'breadcrumb' }).filter({ hasText: 'mehedi' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'New Item' }).click();
  await page
    .locator('input[type="file"]._s_fileUpload')
    .setInputFiles(path.join(__dirname, '../test-data/sample.mp4'));
  await page.waitForTimeout(15000);

  const dialog = page.getByRole('dialog', { name: 'Upload files' });
  await expect(dialog).toBeVisible();

  const dialogTextboxes = dialog.getByRole('textbox');
  console.log('Dialog textbox count:', await dialogTextboxes.count());

  await dialogTextboxes.nth(0).fill('Automation QA Engineer');
  const typeCombo = dialog.getByRole('combobox').first();
  await typeCombo.click();
  await typeCombo.fill('Video');
  await page.keyboard.press('Enter');
  await dialogTextboxes.nth(1).fill(formatDateTime());
  await page.keyboard.press('Escape');
  await dialogTextboxes.nth(2).fill('Test identity: S1-DISC-12345');

  const tagsCombo = dialog.getByRole('combobox').nth(1);
  await tagsCombo.click();
  for (const tag of ['automation', 'playwright']) {
    await tagsCombo.fill(tag);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  }

  await dialog.locator('span.chakra-checkbox__control').nth(2).click({ force: true });
  await dialogTextboxes.nth(3).fill('https://qatest.marcombox.com/');

  await dialog.getByRole('button', { name: /save|confirm/i }).click();
  console.log('Waiting for upload...');
  await page.waitForTimeout(90000);

  await page.screenshot({ path: 'test-results/after-save-mehedi.png', fullPage: true });
  const body = await page.locator('body').innerText();
  console.log(
    'Result lines:',
    body.split('\n').filter((l) => /automation|sample|error|processing|video/i.test(l)),
  );

  const asset = page.locator('[role="group"]').filter({ hasText: 'Automation QA Engineer' });
  if (await asset.isVisible({ timeout: 10000 }).catch(() => false)) {
    await asset.click();
    await page.waitForTimeout(3000);
    console.log(
      'Detail:',
      (await page.locator('body').innerText())
        .split('\n')
        .filter((l) => /id|title|video|identity/i.test(l)),
    );
    await page.screenshot({ path: 'test-results/detail-mehedi.png', fullPage: true });
  }
});
