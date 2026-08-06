import { test } from '@playwright/test';
import path from 'path';
import { formatDateTime } from '../src/helpers/dateTime';

test('discover asset detail and menu', async ({ page }) => {
  test.setTimeout(300_000);
  const email = process.env.MARCOMBOX_EMAIL!;
  const password = process.env.MARCOMBOX_PASSWORD!;
  const testIdentity = 'S1-DETAIL-' + Date.now();

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
  await page.waitForTimeout(2000);

  await page.getByRole('button', { name: 'New Item' }).click();
  await page
    .locator('input[type="file"]._s_fileUpload')
    .setInputFiles(path.join(__dirname, '../test-data/sample.mp4'));
  await page.waitForTimeout(15000);

  const dialog = page.getByRole('dialog', { name: 'Upload files' });
  const tbs = dialog.getByRole('textbox');
  await tbs.nth(0).fill('Automation QA Engineer');
  await dialog.getByRole('combobox').first().click();
  await page.keyboard.type('Video');
  await page.keyboard.press('Enter');
  await tbs.nth(1).click();
  const day = new Date().getDate();
  await page
    .locator('.react-datepicker__day:not(.react-datepicker__day--outside-month)')
    .filter({ hasText: String(day) })
    .first()
    .click();
  await page.keyboard.press('Escape');
  await tbs.nth(2).fill(`Identity: ${testIdentity}`);
  await dialog.locator('span.chakra-checkbox__control').nth(2).click({ force: true });
  await tbs.nth(3).fill('https://qatest.marcombox.com/');
  await dialog.getByRole('button', { name: /save|confirm/i }).click();
  await expectDialogClosed(page, dialog);

  const card = page.locator('[role="group"]').nth(1);
  console.log('Card text:', await card.innerText());
  await card.hover();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/hover-card.png', fullPage: true });

  // Click card to open detail
  await card.click();
  await page.waitForTimeout(3000);
  const detail = await page.locator('body').innerText();
  console.log(
    'Detail relevant:',
    detail
      .split('\n')
      .filter((l) => /title|id|video|identity|automation|sample|edit|close/i.test(l)),
  );
  await page.screenshot({ path: 'test-results/detail-view.png', fullPage: true });

  // Cleanup
  await page.keyboard.press('Escape');
  await card.hover();
  const btns = page.locator('[role="group"]').nth(1).locator('button');
  console.log('Card buttons:', await btns.count());
});

async function expectDialogClosed(
  page: import('@playwright/test').Page,
  dialog: import('@playwright/test').Locator,
) {
  for (let i = 0; i < 24; i++) {
    if (!(await dialog.isVisible().catch(() => false))) return;
    await page.waitForTimeout(5000);
  }
}
