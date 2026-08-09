import { BeforeScenario, expect } from '@src/fixtures/bdd.fixture';
import { getEnv } from '@src/config/environment';
import { LoginPage } from '@src/pages/login.page';

BeforeScenario(async ({ page, $testInfo }) => {
  if ($testInfo.project.name !== 'chromium') return;

  await page.goto('/home', { waitUntil: 'domcontentloaded' });

  if (/Login/i.test(page.url())) {
    const env = getEnv();
    await new LoginPage(page).login(env.email, env.password);
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
  }

  await expect(page.getByRole('button', { name: 'DAM' })).toBeVisible({ timeout: 60_000 });
});
