import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.setTimeout(60_000);

/**
 * Cart line expand toggle is keyboard accessible (#859)
 *
 * Below 1280 px a cart line on /order-summary is collapsed and its quantity
 * controls live in the expanded panel. The expand toggle is a named button with
 * aria-expanded, so keyboard users can open and close the line; a header click
 * still toggles it. At 1280 px and above the line is laid out inline and the
 * toggle is not shown.
 */
const product = { id: 'prod-1', name: 'STM32F407VGT6 Microcontroller' };

const navigateTo = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
};

const openOrderSummary = async (page: Page) => {
  // A fresh browser context is a fresh guest cart; page.request shares its guest cookie.
  const added = await page.request.post('/api/cart', {
    data: { products: [{ id: product.id, stock: 1, isFolder: false }] },
  });
  expect(added.ok()).toBe(true);

  await navigateTo(page, '/order-summary');
  await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
};

test.describe('Cart line expand toggle', () => {
  const pageErrors: string[] = [];

  test.beforeEach(({ page }) => {
    pageErrors.length = 0;
    page.on('pageerror', (error) => pageErrors.push(error.message));
  });

  test.afterEach(() => {
    expect(pageErrors, 'no unhandled page errors').toEqual([]);
  });

  test('expands and collapses a line from the keyboard at 375 px', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openOrderSummary(page);

    const toggle = page.getByRole('button', { name: `Show details for ${product.name}` });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', { name: 'Decrease quantity' }).filter({ visible: true })).toHaveCount(0);

    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Increase quantity' }).filter({ visible: true })).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath('line-expanded-keyboard-375.png') });

    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', { name: 'Increase quantity' }).filter({ visible: true })).toHaveCount(0);
  });

  test('a header click still toggles the line at 375 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openOrderSummary(page);

    const toggle = page.getByRole('button', { name: `Show details for ${product.name}` });
    await page.getByText(product.name, { exact: true }).filter({ visible: true }).first().click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Increase quantity' }).filter({ visible: true })).toHaveCount(1);
  });

  test('the toggle is hidden at 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openOrderSummary(page);

    await expect(page.getByRole('button', { name: 'Delete item' }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: `Show details for ${product.name}` })).toBeHidden();
  });
});
