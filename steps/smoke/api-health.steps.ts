import { When, Then, expect } from '@src/fixtures/bdd.fixture';

When('I request the application root URL', async ({ request, env, apiResponse }) => {
  apiResponse.last = await request.get(env.baseUrl);
});

When('I request the login page URL', async ({ request, env, apiResponse }) => {
  apiResponse.last = await request.get(`${env.baseUrl}/`);
});

Then('the response status should be below {int}', async ({ apiResponse }, maxStatus: number) => {
  expect(apiResponse.last).toBeDefined();
  expect(apiResponse.last!.status()).toBeLessThan(maxStatus);
});

Then('the login page should respond successfully', async ({ apiResponse }) => {
  expect(apiResponse.last).toBeDefined();
  expect(apiResponse.last!.ok()).toBeTruthy();
  const body = await apiResponse.last!.text();
  expect(body.toLowerCase()).toMatch(/login|marcombox|email/);
});
