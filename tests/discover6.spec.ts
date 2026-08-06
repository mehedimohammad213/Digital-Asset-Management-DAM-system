import { test, expect } from '@playwright/test';
import path from 'path';

const email = process.env.MARCOMBOX_EMAIL!;
const password = process.env.MARCOMBOX_PASSWORD!;

test('discover type select and asset detail', async ({ page }) => {
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
  await page.locator('[role="group"]').filter({ hasText: 'mehedi' }).filter({ hasText: 'subfolders' }).dblclick();
  await page.waitForTimeout(2000);

  // Open existing asset if any
  const asset = page.locator('[role="group"]').filter({ hasText: 'MP4' }).or(
    page.locator('[role="group"]').filter({ hasText: 'sample' }),
  ).first();
  if (await asset.isVisible({ timeout: 5000 }).catch(() => false)) {
    await asset.click();
    await page.waitForTimeout(3000);
    const text = await page.locator('body').innerText();
    console.log('Asset detail lines:', text.split('\n').filter(l => l.trim()));
    await page.screenshot({ path: 'test-results/asset-open.png', fullPage: true });

    // Find edit, close, item id
    const buttons = await page.getByRole('button').all();
    for (const b of buttons.slice(0, 30)) {
      const name = await b.getAttribute('aria-label') || await b.innerText().catch(() => '');
      if (name) console.log('Button:', name.substring(0, 40));
    }
    await page.keyboard.press('Escape');
  }

  // Test type dropdown
  await page.getByRole('button', { name: 'New Item' }).click();
  await page.locator('input[type="file"]._s_fileUpload').setInputFiles(path.join(__dirname, '../test-data/sample.mp4'));
  await page.waitForTimeout(12000);
  const dialog = page.getByRole('dialog', { name: 'Upload files' });
  const typeCombo = dialog.getByRole('combobox').first();
  await typeCombo.click();
  await page.waitForTimeout(500);
  const options = await page.locator('[role="option"], [class*="option"]').allTextContents();
  console.log('Type options:', options.filter(Boolean).slice(0, 20));
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
});
