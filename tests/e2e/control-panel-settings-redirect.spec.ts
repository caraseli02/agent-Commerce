import { expect, test, type Page } from '@playwright/test';

const signInAsAdmin = async (page: Page) => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  const loginResponse = await page.request.post(`${baseURL}/api/auth/login`, {
    data: { email: 'admin@demo.com', password: 'admin123' },
  });
  const { token } = (await loginResponse.json()) as { token: string };

  await page.context().addCookies([
    {
      name: 'token',
      value: token,
      domain: new URL(baseURL).hostname,
      path: '/',
    },
  ]);
};

test('legacy personal-customer settings URLs redirect to account details', async ({ page }) => {
  await signInAsAdmin(page);

  await page.goto('/dashboard/customers/customer-001/control-panel/settings', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/dashboard\/customers\/customer-001\/control-panel\/account$/);
  await expect(page.getByRole('heading', { name: /account details/i })).toBeVisible();
});
