import { expect, test, type Page } from '@playwright/test';

const signInAsAdmin = async (page: Page) => {
  await page.goto('/?signin=true', { waitUntil: 'networkidle' });

  await page.getByRole('radio', { name: 'Admin Preview' }).click();
  await expect(page.getByLabel('E-mail or client code')).toHaveValue('admin@demo.com');
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
  test('admin preview sign-in hydrates its own profile without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedApiRequests: string[] = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() >= 400) failedApiRequests.push(`${response.status()} ${response.url()}`);
    });

    const detailsResponse = page.waitForResponse((response) => response.url().includes('/api/user/mock-admin-1/details'));
    await signInAsAdmin(page);
    expect((await detailsResponse).status()).toBe(200);

    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page.getByText('Demo Admin').first()).toBeVisible();
    expect(failedApiRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('admin preview can load orders, customers, and a customer control panel', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') runtimeErrors.push(message.text());
    });

    await signInAsAdmin(page);
    runtimeErrors.length = 0;

    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
    // Orders list newest-first, so assert the first row links to an order rather than a fixed seed.
    const firstOrderRow = page.getByTestId('virtualized-table-body').first().locator('tr[data-index]').first();
    await expect(firstOrderRow.locator('a[href^="/dashboard/orders/"]').first()).toBeVisible();

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
    expect(runtimeErrors).toEqual([]);
  });
});
