import { expect, test } from '@playwright/test';

test('signed-out tracking protects order details and returns a buyer to their orders after sign-in', async ({ page }) => {
  await page.goto('/order-tracking', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /order tracking is available in your account/i })).toBeVisible();

  await page.getByRole('link', { name: /sign in to view your orders/i }).click();
  await expect(page).toHaveURL(/redirect=%2Fdashboard%2Fclient%3Ftab%3Dorders/);

  const signIn = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signIn.click(),
  ]);
  await expect(page).toHaveURL(/\/dashboard\/client\?tab=orders/);
});
