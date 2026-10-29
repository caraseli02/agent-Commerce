import { expect, test } from '@playwright/test';
import type { Page, Route, TestInfo } from '@playwright/test';

test.setTimeout(60_000);

/**
 * Cart delete failure feedback (#850)
 *
 * When the cart DELETE fails (non-success response or network rejection), the
 * confirm dialog on /order-summary stays open with its buttons enabled and a
 * destructive toast asks the shopper to retry. A retry that succeeds removes the
 * item(s) and closes the dialog. Covers the single-item and bulk deletes.
 */
const products = [
  { id: 'prod-1', name: 'STM32F407VGT6 Microcontroller' },
  { id: 'prod-2', name: 'ADM2587E RS-485 Transceiver' },
];

const navigateTo = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
};

const isCartDelete = (route: Route) => route.request().method() === 'DELETE';

const failNextCartDelete = async (page: Page, failure: 'status' | 'network') => {
  await page.route(
    '**/api/cart',
    async (route) => {
      if (!isCartDelete(route)) {
        await route.fallback();
        return;
      }
      if (failure === 'network') {
        await route.abort('failed');
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'failed', description: 'Mock cart delete failure' }),
      });
    },
    { times: 1 },
  );
};

const expectRetryableFailure = async (page: Page, dialogTitle: RegExp, toastTitle: string, testInfo: TestInfo, shot: string) => {
  const dialog = page.getByRole('dialog').filter({ hasText: dialogTitle });
  await expect(page.getByText(toastTitle, { exact: true })).toBeVisible();
  await expect(page.getByText('Please try again.', { exact: true })).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Delete' })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath(`${shot}.png`) });
  return dialog;
};

test.describe('Cart delete failure feedback', () => {
  const pageErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors.length = 0;
    page.on('pageerror', (error) => pageErrors.push(error.message));

    // A fresh browser context is a fresh guest cart; page.request shares its guest cookie.
    const added = await page.request.post('/api/cart', {
      data: { products: products.map((product) => ({ id: product.id, stock: 1, isFolder: false })) },
    });
    expect(added.ok()).toBe(true);

    await navigateTo(page, '/order-summary');
    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    for (const product of products) {
      await expect(page.getByText(product.name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    }
  });

  test.afterEach(() => {
    expect(pageErrors, 'no unhandled page errors').toEqual([]);
  });

  test('single delete keeps the dialog open on failure and removes the item on retry', async ({ page }, testInfo) => {
    const [first, second] = products;

    await page.getByRole('button', { name: 'Delete item' }).first().click();
    const dialogTitle = /delete item/i;

    for (const failure of ['status', 'network'] as const) {
      await failNextCartDelete(page, failure);
      await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
      await expectRetryableFailure(page, dialogTitle, 'Could not remove item', testInfo, `single-${failure}-failure`);
    }

    const dialog = page.getByRole('dialog');
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'DELETE' && response.ok()),
      dialog.getByRole('button', { name: 'Delete' }).click(),
    ]);
    await expect(dialog).toBeHidden();
    await expect(page.getByText(first.name, { exact: true }).filter({ visible: true })).toHaveCount(0);
    await expect(page.getByText(second.name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('single-retry-removed.png') });
  });

  test('bulk delete keeps the dialog open on failure and removes the items on retry', async ({ page }, testInfo) => {
    await page.getByRole('checkbox', { name: 'Select All' }).click();
    await page.getByRole('button', { name: /delete selected/i }).click();
    const dialogTitle = /delete .*items/i;

    for (const failure of ['status', 'network'] as const) {
      await failNextCartDelete(page, failure);
      await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
      await expectRetryableFailure(page, dialogTitle, 'Could not remove items', testInfo, `bulk-${failure}-failure`);
    }

    const dialog = page.getByRole('dialog');
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'DELETE' && response.ok()),
      dialog.getByRole('button', { name: 'Delete' }).click(),
    ]);
    await expect(dialog).toBeHidden();
    for (const product of products) {
      await expect(page.getByText(product.name, { exact: true }).filter({ visible: true })).toHaveCount(0);
    }
    await page.screenshot({ path: testInfo.outputPath('bulk-retry-removed.png') });
  });
});
