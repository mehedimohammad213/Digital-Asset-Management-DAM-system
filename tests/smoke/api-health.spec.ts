import { test, expect } from '@src/fixtures/base.fixture';

test.describe('API health @smoke @api', () => {
  test('application root responds without server error @smoke @api', async ({ request, env }) => {
    const response = await request.get(env.baseUrl);
    expect(response.status()).toBeLessThan(500);
  });

  test('login page is reachable @smoke @api', async ({ request, env }) => {
    const response = await request.get(`${env.baseUrl}/`);
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body.toLowerCase()).toMatch(/login|marcombox|email/);
  });
});
