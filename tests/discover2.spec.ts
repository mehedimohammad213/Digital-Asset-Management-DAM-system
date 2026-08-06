import { test } from '@playwright/test';
import path from 'path';

const email = process.env.MARCOMBOX_EMAIL!;
const password = process.env.MARCOMBOX_PASSWORD!;

test('discover form input structure', async ({ page }) => {
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
  await page.locator('[role="treeitem"]').filter({ hasText: 'mehedi' }).dblclick();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'New Item' }).click();
  await page
    .locator('input[type="file"]._s_fileUpload')
    .setInputFiles(path.join(__dirname, '../test-data/sample.mp4'));
  await page.waitForTimeout(15000);

  const structure = await page.evaluate(() => {
    const result: Record<string, unknown>[] = [];
    const texts = [
      'Title',
      'Type',
      'Date Time',
      'Description',
      'Tags',
      'Automated Testdata',
      'Hyperlink',
    ];
    for (const t of texts) {
      const el = Array.from(document.querySelectorAll('p, label, span, div')).find(
        (e) => e.textContent?.trim() === t || e.textContent?.trim().includes(t),
      );
      if (el) {
        const parent =
          el.closest('[class*="field"], [class*="form"], div')?.parentElement ?? el.parentElement;
        const inputs = parent?.querySelectorAll(
          'input:not([type="checkbox"]):not([type="file"]), textarea, select, [role="combobox"]',
        );
        result.push({
          label: t,
          parentClass: parent?.className?.substring?.(0, 80),
          inputs: Array.from(inputs ?? []).map((i) => ({
            tag: i.tagName,
            type: (i as HTMLInputElement).type,
            role: i.getAttribute('role'),
            placeholder: (i as HTMLInputElement).placeholder,
            class: i.className?.substring?.(0, 60),
          })),
        });
      }
    }
    return result;
  });
  console.log(JSON.stringify(structure, null, 2));

  // Try filling fields
  const titleInput = page
    .locator('input')
    .filter({ has: page.locator('xpath=..') })
    .nth(0);
  console.log('All visible inputs:');
  const allInputs = await page
    .locator('input:visible, textarea:visible, [role="combobox"]:visible')
    .all();
  for (let i = 0; i < allInputs.length; i++) {
    const info = await allInputs[i].evaluate((el) => ({
      tag: el.tagName,
      type: (el as HTMLInputElement).type,
      placeholder: (el as HTMLInputElement).placeholder,
      ariaLabel: el.getAttribute('aria-label'),
      nearby: el.closest('div')?.innerText?.substring(0, 80),
    }));
    console.log(`Input ${i}:`, info);
  }
});
