import { expect, test, type Page } from '@playwright/test';

const signInAsAdmin = async (page: Page) => {
  await page.goto('/?signin=true', { waitUntil: 'networkidle' });

  await page.getByRole('radio', { name: 'Admin Preview' }).click();
  await expect(page.getByLabel('E-mail or client code')).toHaveValue('admin@demo.com');

  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await Promise.all([
    page.waitForURL(/\/dashboard\/orders$/),
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
};

test.describe('Dashboard virtualized orders table', () => {
  test('mounts fewer DOM rows than loaded items at max page size', async ({ page }) => {
    await signInAsAdmin(page);
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
    await expect(page.getByText('120 item(s)')).toBeVisible();

    const rowsPerPageTrigger = page.getByRole('combobox').first();
    await rowsPerPageTrigger.click();

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/orders') && response.request().method() === 'GET' && response.url().includes('perPage=50'),
      ),
      page.getByRole('option', { name: '50' }).click(),
    ]);

    await expect(rowsPerPageTrigger).toHaveText('50');

    const tableBody = page.getByTestId('virtualized-table-body');
    await expect(tableBody).toBeVisible();

    const mountedDataRows = await tableBody.locator('tr[data-index]').count();
    expect(mountedDataRows).toBeGreaterThan(0);
    expect(mountedDataRows).toBeLessThan(50);
  });

  test('keeps admin orders reachable at 390px after virtualization', async ({ page }) => {
    await signInAsAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);

    const region = page.getByRole('region', { name: 'Data table' });
    await expect(region).toBeVisible();
    await expect(page.getByRole('link', { name: /ORD-2024-0001/i }).first()).toBeVisible();
  });
});
