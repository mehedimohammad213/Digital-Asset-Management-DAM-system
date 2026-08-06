import { test } from '@playwright/test';
import path from 'path';

const email = process.env.MARCOMBOX_EMAIL!;
const password = process.env.MARCOMBOX_PASSWORD!;

test('debug save validation', async ({ page }) => {
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
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'New Item' }).click();
  await page.locator('input[type="file"]._s_fileUpload').setInputFiles(path.join(__dirname, '../test-data/sample.mp4'));
  await page.waitForTimeout(15000);

  const dialog = page.getByRole('dialog', { name: 'Upload files' });
  const tbs = dialog.getByRole('textbox');

  await tbs.nth(0).fill('Automation QA Engineer');
  const typeCombo = dialog.getByRole('combobox').first();
  await typeCombo.click();
  await typeCombo.fill('Video');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  // Check type selected
  console.log('Type area:', await dialog.locator('p').filter({ hasText: 'Type' }).locator('..').innerText());

  // Try clicking date field and using datepicker
  await tbs.nth(1).click();
  await page.waitForTimeout(500);
  const today = new Date();
  const day = today.getDate();
  await page.locator('.react-datepicker__day:not(.react-datepicker__day--outside-month)').filter({ hasText: String(day) }).first().click().catch(() => undefined);
  await page.keyboard.press('Escape');

  await tbs.nth(2).fill('Test identity: DEBUG-123');
  const tagsCombo = dialog.getByRole('combobox').nth(1);
  await tagsCombo.click();
  await tagsCombo.fill('automation');
  await page.keyboard.press('Enter');
  await tagsCombo.fill('playwright');
  await page.keyboard.press('Enter');
  await dialog.locator('span.chakra-checkbox__control').nth(2).click({ force: true });
  await tbs.nth(3).fill('https://qatest.marcombox.com/');

  await page.screenshot({ path: 'test-results/before-save.png', fullPage: true });
  console.log('Form before save:', await dialog.innerText());

  await dialog.getByRole('button', { name: /save|confirm/i }).click();

  // Wait and watch for changes
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(5000);
    const body = await page.locator('body').innerText();
    const dialogVisible = await dialog.isVisible().catch(() => false);
    console.log(`T+${(i+1)*5}s dialog=${dialogVisible}, items=${body.match(/(\d+) items/)?.[0]}, errors=${body.match(/error|required|invalid/gi)}`);
    if (!dialogVisible) break;
  }

  await page.screenshot({ path: 'test-results/after-save-debug.png', fullPage: true });
  console.log('Final body:', (await page.locator('body').innerText()).split('\n').slice(0, 40));
});
