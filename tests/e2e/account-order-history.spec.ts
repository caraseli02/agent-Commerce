import { expect, test } from '@playwright/test';

const signInAsCustomer = async (page: import('@playwright/test').Page) => {
  await page.goto('/?signin=true', { waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: 'Customer Demo' }).click();
  await expect(page.getByLabel('E-mail or client code')).toHaveValue('customer@demo.com');
  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await expect(signInButton).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
  await expect(page).toHaveURL(/\/dashboard\/client\?tab=home/);
};

/**
 * Tier 1 Critical Flow: Order History / Account View
 *
 * Verifies a signed-in customer can reach their account orders tab in the real
 * browser and see order history content without being blocked by auth redirects.
 */
test.describe('Order History / Account View', () => {
  test('signed-in customer can view account order history', async ({ page }) => {
    await signInAsCustomer(page);

    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/orders') && response.request().method() === 'GET'),
      page.goto('/dashboard/client?tab=orders'),
    ]);

    await expect(page).toHaveURL(/\/dashboard\/client\?tab=orders/);
    await expect(page.getByText(/active orders/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /orders list/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ORD-2024-0001/i }).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const table = page.getByRole('region', { name: 'Data table' });
    const scrollHint = page.getByText(/scroll to view more order details/i);
    await expect(table).toBeVisible();
    await expect(scrollHint).toBeVisible();
    await page.getByTestId('virtualized-table-scroll').evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect(scrollHint).toHaveCount(0);
  });
});
