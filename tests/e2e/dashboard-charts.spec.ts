import { expect, test, type Page } from '@playwright/test';

const signInAsAdmin = async (page: Page) => {
  await page.goto('/?signin=true', { waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: 'Admin Preview' }).click();

  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);

  await expect(page).toHaveURL(/\/dashboard\/orders$/);
};

test('dashboard charts render across customer surfaces without chart runtime errors', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      runtimeErrors.push(message.text());
    }
  });

  await signInAsAdmin(page);
  runtimeErrors.length = 0;

  await page.goto('/dashboard/customers', { waitUntil: 'networkidle' });

  await expect(page.locator('.apexcharts-canvas')).toHaveCount(2);
  await expect(page.locator('.apexcharts-svg path').first()).toBeVisible();
  expect(runtimeErrors).toEqual([]);

  runtimeErrors.length = 0;
  await page.goto('/dashboard/customers/customer-001', { waitUntil: 'networkidle' });
  await expect(page.getByText('Net Margin')).toBeVisible();
  await expect(page.locator('.apexcharts-canvas')).toHaveCount(1);
  await expect(page.locator('.apexcharts-svg path').first()).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
