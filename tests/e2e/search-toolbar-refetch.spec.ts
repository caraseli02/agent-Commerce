import { expect, type Page, test } from '@playwright/test';

// Regression for #801: a sort, page or page-size refetch must not swap the results for the
// skeleton, which remounted SearchProducts and reset its toolbar and pager to their defaults.

const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

const results = (page: Page) => page.locator('section[aria-busy]');

async function choose(page: Page, label: string, option: string) {
  const id = await page.getByText(label, { exact: true }).first().getAttribute('for');
  await page.locator(`[id="${id}"]`).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(results(page)).toHaveAttribute('aria-busy', 'false');
}

for (const viewport of viewports) {
  test(`search toolbar and pager keep the chosen values after refetch (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/search', { waitUntil: 'networkidle' });
    await expect(results(page)).toHaveAttribute('aria-busy', 'false');

    await choose(page, 'Sort by', 'Price High–Low');
    const sortId = await page.getByText('Sort by', { exact: true }).getAttribute('for');
    await expect(page.locator(`[id="${sortId}"]`)).toHaveText('Price High–Low');

    const pager = results(page).locator('.searchProducts--pagination-item-active').first();
    await results(page).getByRole('button', { name: 'Next page' }).first().click();
    await expect(results(page)).toHaveAttribute('aria-busy', 'false');
    await expect(pager).toHaveText('2');
    await expect(results(page).getByRole('button', { name: 'Previous page' }).first()).toBeVisible();

    await results(page).getByRole('button', { name: 'Next page' }).first().click();
    await expect(results(page)).toHaveAttribute('aria-busy', 'false');
    await expect(pager).toHaveText('3');
    await expect(page.locator(`[id="${sortId}"]`)).toHaveText('Price High–Low');

    await choose(page, 'Products on page', '5');
    const perPageId = await page.getByText('Products on page', { exact: true }).first().getAttribute('for');
    await expect(page.locator(`[id="${perPageId}"]`)).toHaveText('5');
    await expect(results(page).locator('.grid.grid-cols-1.gap-5 > *')).toHaveCount(5);
  });
}
