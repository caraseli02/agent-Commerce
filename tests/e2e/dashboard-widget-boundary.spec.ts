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

test.describe('Dashboard widget error boundaries', () => {
  test('contained Returning Customers fault keeps customers dashboard usable', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    await signInAsAdmin(page);
    runtimeErrors.length = 0;

    await page.goto('/dashboard/customers?dashboardFault=returning-customers', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/customers by country/i)).toBeVisible();
    await expect(page.getByText(/customers list/i)).toBeVisible();
    await expect(page.getByText(/john smith/i).first()).toBeVisible();

    const boundary = page.locator('[data-dashboard-widget-boundary="returning-customers"]');
    await expect(boundary).toBeVisible();
    await expect(boundary).toHaveAttribute('role', 'alert');
    await expect(boundary.getByText(/returning customers couldn't load/i)).toBeVisible();
    await expect(boundary.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(boundary.getByRole('link', { name: 'Back to customers' })).toBeVisible();

    expect(runtimeErrors.filter((message) => message.includes('Forced fault for dashboard widget'))).toHaveLength(0);
  });

  test('healthy Admin Smoke Path routes still load without fault injection', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        runtimeErrors.push(message.text());
      }
    });

    await signInAsAdmin(page);
    runtimeErrors.length = 0;

    await page.goto('/dashboard/customers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/returning customers/i)).toBeVisible();
    await expect(page.locator('[data-dashboard-widget-boundary="returning-customers"]')).toHaveCount(0);

    await page.goto('/dashboard/customers/customer-001/control-panel/account', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /account details/i })).toBeVisible();

    expect(runtimeErrors).toEqual([]);
  });
});
