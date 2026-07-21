import { expect, test, type Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

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

const assertNoDocumentOverflow = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
};

const assertScrollRegionExposesContent = async (page: Page, regionLabel: string | RegExp) => {
  const region = page.getByRole('region', { name: regionLabel });
  await expect(region).toBeVisible();

  const metrics = await region.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    scrollLeft: element.scrollLeft,
  }));

  if (metrics.scrollWidth > metrics.clientWidth) {
    await region.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });

    const scrolled = await region.evaluate((element) => element.scrollLeft);
    expect(scrolled).toBeGreaterThan(0);
  }
};

test.describe('Dashboard mobile tables and navigation', () => {
  test('admin data surfaces stay contained and scrollable at 390px', async ({ page }) => {
    await signInAsAdmin(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await assertNoDocumentOverflow(page);
    await assertScrollRegionExposesContent(page, 'Data table');
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();

    await page.goto('/dashboard/customers', { waitUntil: 'domcontentloaded' });
    await assertNoDocumentOverflow(page);
    await assertScrollRegionExposesContent(page, 'Data table');
    await expect(page.getByText(/customers list/i)).toBeVisible();

    await page.goto('/dashboard/products/categories', { waitUntil: 'domcontentloaded' });
    await assertNoDocumentOverflow(page);
    await assertScrollRegionExposesContent(page, 'Categories table');
    await expect(page.getByRole('heading', { name: 'Categories', exact: true })).toBeVisible();

    await page.goto('/dashboard/customers/customer-001/control-panel/transaction-history', { waitUntil: 'domcontentloaded' });
    await assertNoDocumentOverflow(page);
    await assertScrollRegionExposesContent(page, 'Data table');
    await assertScrollRegionExposesContent(page, 'Control panel sections');
    await expect(page.getByRole('link', { name: 'Transaction history' })).toBeVisible();
  });
});
