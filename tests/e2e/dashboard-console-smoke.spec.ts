import { expect, test, type Page } from '@playwright/test';

const collectRuntimeErrors = (page: Page) => {
  const runtimeErrors: string[] = [];

  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      runtimeErrors.push(message.text());
    }
  });

  return runtimeErrors;
};

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

const signInAsCustomer = async (page: Page) => {
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

test.describe('Dashboard console smoke', () => {
  test('admin representative paths stay free of console errors', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await signInAsAdmin(page);
    runtimeErrors.length = 0;

    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
    expect(runtimeErrors, 'orders dashboard').toEqual([]);

    await page.goto('/dashboard/customers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/customers list/i)).toBeVisible();
    expect(runtimeErrors, 'customers dashboard').toEqual([]);

    await page.goto('/dashboard/customers/customer-001', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/customer profile/i).first()).toBeVisible();
    expect(runtimeErrors, 'customer profile').toEqual([]);

    await page.goto('/dashboard/customers/customer-001/control-panel/account', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /account details/i })).toBeVisible();
    expect(runtimeErrors, 'control-panel account').toEqual([]);

    await page.goto('/dashboard/customers/customer-001/control-panel/shipping', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /shipping/i })).toBeVisible();
    expect(runtimeErrors, 'control-panel shipping').toEqual([]);

    await page.goto('/dashboard/products/categories', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Categories', exact: true })).toBeVisible();
    expect(runtimeErrors, 'categories dashboard').toEqual([]);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/recent orders/i)).toBeVisible();
    expect(runtimeErrors, 'dashboard overview').toEqual([]);

    await page.goto('/dashboard/customers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/customers by country/i)).toBeVisible();
    expect(runtimeErrors, 'customers dashboard').toEqual([]);
  });

  test('customer representative paths stay free of console errors', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await signInAsCustomer(page);
    runtimeErrors.length = 0;

    await expect(page.getByText(/active orders/i)).toBeVisible();
    expect(runtimeErrors, 'customer home').toEqual([]);

    await page.goto('/dashboard/client?tab=orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /orders list/i })).toBeVisible();
    expect(runtimeErrors, 'customer orders').toEqual([]);

    await page.goto('/dashboard/client?tab=settings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/account details/i).first()).toBeVisible();
    expect(runtimeErrors, 'customer settings').toEqual([]);
  });
});
