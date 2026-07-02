import { expect, test } from '@playwright/test';

/**
 * Tier 1 Critical Flow: Browse → Product Detail
 *
 * Verifies that a user can reach a product detail page and see the
 * essential information (name, price, stock, add-to-cart action).
 * This is the entry point of the purchase journey.
 */
test.describe('Browse → Product Detail', () => {
  test('user can view product details from a direct product URL', async ({ page }) => {
    await page.goto('/product/prod-1');

    // Product name is visible
    await expect(page.getByText('STM32F407VGT6 Microcontroller', { exact: true })).toBeVisible();

    // Price tiers are displayed
    await expect(page.getByText('999.99').first()).toBeVisible();
    await expect(page.getByText('979.99').first()).toBeVisible();
    await expect(page.getByText('959.99').first()).toBeVisible();

    // Stock information is shown
    await expect(page.getByText(/150 in stock/i)).toBeVisible();

    // Add to cart button is present and actionable
    const addToCartButtons = page.getByRole('button', { name: /add to cart/i });
    await expect(addToCartButtons.first()).toBeVisible();
  });

  test('product page shows technical specifications table', async ({ page }) => {
    await page.goto('/product/prod-1');

    // Specifications heading
    await expect(page.getByRole('button', { name: /specifications/i })).toBeVisible();

    // Technical specs from ParametricData
    await expect(page.getByText('Display Size')).toBeVisible();
    await expect(page.getByText('6.7')).toBeVisible();
    await expect(page.getByText('Storage')).toBeVisible();
    await expect(page.getByText('128GB')).toBeVisible();
  });

  test('product page shows breadcrumbs navigation', async ({ page }) => {
    await page.goto('/product/prod-1');

    await expect(page.getByRole('link', { name: 'Electronics' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Smartphones' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Flagship' })).toBeVisible();
  });
});
