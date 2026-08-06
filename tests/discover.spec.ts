import { test } from '@playwright/test';
import path from 'path';

const email = process.env.MARCOMBOX_EMAIL!;
const password = process.env.MARCOMBOX_PASSWORD!;

test('discover asset form fields', async ({ page }) => {
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

  await page.locator('[role="treeitem"]').filter({ hasText: 'mehedi' }).click();
  await page.waitForTimeout(2000);

  await page.getByRole('button', { name: 'New Item' }).click();
  await page.locator('input[type="file"]._s_fileUpload').setInputFiles(path.join(__dirname, '../test-data/sample.mp4'));

  // Wait for form to appear
  await page.waitForTimeout(15000);

  const bodyText = await page.locator('body').innerText();
  console.log('=== BODY TEXT (relevant lines) ===');
  bodyText.split('\n').filter(l => l.trim()).forEach(l => console.log(l));

  const fields = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('label')).map(l => ({
      label: l.textContent?.trim(),
      for: l.getAttribute('for'),
      input: l.parentElement?.querySelector('input, textarea, select')?.outerHTML?.substring(0, 100),
    }));
  });
  console.log('=== LABELS ===', JSON.stringify(fields, null, 2));

  await page.screenshot({ path: 'test-results/discover-form.png', fullPage: true });
});
