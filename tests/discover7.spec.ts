import { test } from '@playwright/test';
import path from 'path';

test('discover folder contents and type dropdown', async ({ page }) => {
  test.setTimeout(300_000);
  const email = process.env.MARCOMBOX_EMAIL!;
  const password = process.env.MARCOMBOX_PASSWORD!;

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

  const groups = page.locator('[role="group"]');
  console.log('Groups count:', await groups.count());
  for (let i = 0; i < await groups.count(); i++) {
    console.log(`Group ${i}:`, await groups.nth(i).innerText());
  }

  await page.getByRole('button', { name: 'New Item' }).click();
  await page.locator('input[type="file"]._s_fileUpload').setInputFiles(path.join(__dirname, '../test-data/sample.mp4'));
  await page.waitForTimeout(12000);

  const dialog = page.getByRole('dialog', { name: 'Upload files' });
  const typeSection = dialog.locator('p').filter({ hasText: /^Type$/ }).locator('..');
  await typeSection.getByRole('combobox').click();
  await page.waitForTimeout(1000);

  const listbox = page.locator('[role="listbox"]');
  console.log('Listbox visible:', await listbox.isVisible().catch(() => false));
  console.log('Listbox options:', await listbox.locator('[role="option"]').allTextContents().catch(() => []));
  console.log('All options on page:', await page.locator('[role="option"]').allTextContents());

  // Try selecting Video via keyboard in combobox
  await typeSection.getByRole('combobox').fill('Video');
  await page.waitForTimeout(500);
  console.log('After typing Video:', await typeSection.innerText());
  await page.locator('[role="option"]').filter({ hasText: /^Video$/ }).first().click().catch(async () => {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  });
  console.log('After select:', await typeSection.innerText());
});
