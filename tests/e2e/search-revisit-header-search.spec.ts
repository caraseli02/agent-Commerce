import { expect, test } from '@playwright/test';

// Regression for #812: /search listeners on the tiny-emitter bus used to outlive the page, so a
// revisit answered bus events from every earlier visit. Header search must behave the same after
// leaving and returning. Mock search returns no facets, so the filter panel and Reset Filters stay hidden.

const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

for (const viewport of viewports) {
  test(`search answers header search after leaving and returning (${viewport.name})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/search', { waitUntil: 'networkidle' });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.goBack({ waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/search/);

    const results = page.locator('section[aria-busy]');
    await expect(results).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByText('Products Found (24)').filter({ visible: true })).toBeVisible();

    // Mobile collapses the header search behind a button.
    const openSearch = page.getByRole('button', { name: 'Search products' });
    if (await openSearch.isVisible()) {
      await openSearch.click();
    }
    await page.getByRole('searchbox', { name: 'Search products' }).filter({ visible: true }).first().fill('ADM2587E');
    await expect(page.getByText('Products Found (1)').filter({ visible: true })).toBeVisible();
    await expect(results.getByRole('link', { name: 'ADM2587E RS-485 Transceiver' }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });
}
