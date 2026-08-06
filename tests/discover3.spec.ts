import { test, expect } from '@playwright/test';
import path from 'path';
import { uniqueTestId, SCENARIO1_PREFIX } from '../src/helpers/testData';
import { formatDateTime } from '../src/helpers/dateTime';

const email = process.env.MARCOMBOX_EMAIL!;
const password = process.env.MARCOMBOX_PASSWORD!;
const testIdentity = uniqueTestId(SCENARIO1_PREFIX + '-DISC');

test('discover full flow partial', async ({ page }) => {
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
  await page.waitForTimeout(10000);

  const dialog = page.getByRole('dialog').filter({ hasText: 'Upload files' });

  const fillField = async (label: string, value: string) => {
    await dialog
      .locator('div')
      .filter({
        has: page.locator('p').filter({ hasText: new RegExp(`^${label}$`, 'i') }),
      })
      .getByRole('textbox')
      .first()
      .fill(value);
  };

  await fillField('Title', 'Automation QA Engineer');
  const typeCombo = dialog
    .locator('div')
    .filter({ has: page.locator('p').filter({ hasText: /^Type$/i }) })
    .getByRole('combobox')
    .first();
  await typeCombo.click();
  await page.getByRole('option', { name: 'Video' }).click();
  await fillField('Date Time', formatDateTime());
  await fillField('Description', `Test identity: ${testIdentity}`);
  await dialog
    .locator('div')
    .filter({ has: page.getByText(/Automated Testdata/i) })
    .getByRole('checkbox')
    .check();
  await fillField('Hyperlink', 'https://qatest.marcombox.com/');

  await dialog.getByRole('button', { name: 'Save' }).click();
  console.log('Save clicked, waiting for processing...');
  await page.waitForTimeout(45000);

  await page.screenshot({ path: 'test-results/after-save.png', fullPage: true });
  const bodyAfterSave = await page.locator('body').innerText();
  console.log(
    'After save lines:',
    bodyAfterSave.split('\n').filter((l) => /automation|sample|video|error/i.test(l)),
  );

  const assetCard = page.locator('[role="group"]').filter({ hasText: 'Automation QA Engineer' });
  await expect(assetCard).toBeVisible({ timeout: 30_000 });
  await assetCard.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/asset-detail.png', fullPage: true });

  const detailText = await page.locator('body').innerText();
  console.log(
    'Detail:',
    detailText.split('\n').filter((l) => /title|id|video|automation|identity/i.test(l)),
  );

  // Cleanup
  await page.keyboard.press('Escape');
});
