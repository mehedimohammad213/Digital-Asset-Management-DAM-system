import { test, expect } from '@marcombox/fixtures/marcombox.fixture';

test.describe('MarcomBox API health @smoke @api', () => {
  test('application root responds without server error @smoke @api', async ({
    request,
    marcomboxEnv,
  }) => {
    const response = await request.get(marcomboxEnv.baseUrl);
    expect(response.status()).toBeLessThan(500);
  });

  test('login page is reachable @smoke @api', async ({ request, marcomboxEnv }) => {
    const response = await request.get(`${marcomboxEnv.baseUrl}/`);
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body.toLowerCase()).toMatch(/login|marcombox|email/);
  });
});
