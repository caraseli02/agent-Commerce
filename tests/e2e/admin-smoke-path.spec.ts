import { expect, test, type Page } from '@playwright/test';

const signInAsAdmin = async (page: Page) => {
  await page.goto('/?signin=true');

  await page
    .locator('button')
    .filter({ hasText: /Admin Preview/ })
    .click();
  await expect(page.getByPlaceholder('Hidden for demo sign-in')).toHaveValue('');

  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await expect(signInButton).toBeVisible();

  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);

  await expect(page).toHaveURL(/\/dashboard\/orders$/);
};

test.describe('Admin Smoke Path', () => {
  test('admin preview can load orders, customers, and a customer control panel', async ({ page }) => {
    await signInAsAdmin(page);

    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /ORD-2024-0001/i }).first()).toBeVisible();

    await Promise.all([page.waitForURL(/\/dashboard\/customers$/), page.locator('a[href="/dashboard/customers"]').click()]);
    await expect(page).toHaveURL(/\/dashboard\/customers$/);
    await expect(page.getByText(/customers by country/i)).toBeVisible();
    await expect(page.getByText(/customers list/i)).toBeVisible();
    await expect(page.getByText(/john smith/i).first()).toBeVisible();

    await page.goto('/dashboard/customers/customer-001/control-panel/account', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard\/customers\/customer-001\/control-panel\/account$/);
    await expect(page.getByText(/credit limit/i).first()).toBeVisible();
    await expect(page.getByText(/available credit/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /account details/i })).toBeVisible();
    await expect(page.locator('input[value="John"]').first()).toBeVisible();
  });
});
