import { expect, test, type Page } from '@playwright/test';

/**
 * #788: a tab response that lands after the shopper picked another tab must
 * not replace the selected tab's products in the home "Featured inventory" grid.
 */

type TabProduct = { name: string };

async function tabProductNames(page: Page, tab: string) {
  const response = await page.request.get(`/api/products/${tab}`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { data: TabProduct[] };
  return body.data.map((product) => product.name);
}

/** Holds the Best Sellers response until `release` is called. */
async function holdBestSellers(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/products/best-sellers', async (route) => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  return release;
}

async function settleRendering(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

const productHeading = (page: Page, name: string) => page.getByRole('heading', { level: 3, name, exact: true });

test.describe('home product tabs keep the selected tab products', () => {
  test('a slow earlier tab response does not replace a later tab', async ({ page }) => {
    const [bestSellers, hotDeals] = await Promise.all([tabProductNames(page, 'best-sellers'), tabProductNames(page, 'hot-deals')]);
    const release = await holdBestSellers(page);

    await page.goto('/', { waitUntil: 'networkidle' });
    const bestSellersResponse = page.waitForResponse('**/api/products/best-sellers');
    await page.getByRole('button', { name: 'Best Sellers', exact: true }).click();
    await page.getByRole('button', { name: 'Hot Deals', exact: true }).click();
    await expect(productHeading(page, hotDeals[0]!)).toBeVisible();

    release();
    await bestSellersResponse;
    await settleRendering(page);

    await expect(productHeading(page, hotDeals[0]!)).toBeVisible();
    await expect(productHeading(page, bestSellers[0]!)).toHaveCount(0);
  });

  test('switching back to the initial tab keeps its products', async ({ page }) => {
    const [featured, bestSellers] = await Promise.all([tabProductNames(page, 'featured'), tabProductNames(page, 'best-sellers')]);
    const release = await holdBestSellers(page);

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(productHeading(page, featured[0]!)).toBeVisible();
    const bestSellersResponse = page.waitForResponse('**/api/products/best-sellers');
    await page.getByRole('button', { name: 'Best Sellers', exact: true }).click();
    await page.getByRole('button', { name: 'Featured', exact: true }).click();

    release();
    await bestSellersResponse;
    await settleRendering(page);

    await expect(productHeading(page, featured[0]!)).toBeVisible();
    await expect(productHeading(page, bestSellers[0]!)).toHaveCount(0);
  });
});
