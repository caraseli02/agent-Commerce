import { expect, test } from '@playwright/test';
import { disableMotion, expectCleanRuntime, preparePopulatedCart, signInAsCustomer, visit } from '../playwright-support/runtime';

const VIEWPORTS = [
  { name: 'mobile', size: { width: 390, height: 844 } },
  { name: 'desktop', size: { width: 1440, height: 900 } },
] as const;

test.beforeEach(async ({ page }) => {
  await disableMotion(page);
});

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} storefront recovery matrix`, () => {
    test.use({ viewport: viewport.size });

    test('homepage preserves header and merchandising', async ({ page }) => {
      const signals = await visit(page, '/');
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

      await expect(page).toHaveScreenshot(`home-${viewport.name}.png`);
      await expect(page.getByRole('banner')).toHaveScreenshot(`home-header-${viewport.name}.png`);
      expectCleanRuntime(signals, '/');
    });

    test('populated search preserves its result card', async ({ page }) => {
      const signals = await visit(page, '/search?keyword=STM32');
      const productLink = page.getByRole('link', { name: 'STM32F407VGT6 Microcontroller', exact: true }).first();
      await expect(productLink).toBeVisible();
      const productCard = productLink.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');

      await expect(page).toHaveScreenshot(`search-stm32-${viewport.name}.png`);
      await expect(productCard).toHaveScreenshot(`search-result-card-${viewport.name}.png`);
      expectCleanRuntime(signals, '/search?keyword=STM32');
    });

    test('product detail preserves its purchase controls', async ({ page }) => {
      const signals = await visit(page, '/product/prod-1');
      await expect(page.getByRole('heading', { level: 1, name: 'STM32F407VGT6 Microcontroller' })).toBeVisible();
      const purchasePanel = page.getByTestId('product-purchase-panel');
      await expect(purchasePanel).toBeVisible();

      await expect(page).toHaveScreenshot(`product-detail-${viewport.name}.png`);
      await expect(purchasePanel).toHaveScreenshot(`product-purchase-panel-${viewport.name}.png`);
      expectCleanRuntime(signals, '/product/prod-1');
    });

    test('populated cart preserves checkout entry', async ({ page }) => {
      const { cartSheet, signals } = await preparePopulatedCart(page);

      await expect(page).toHaveScreenshot(`populated-cart-${viewport.name}.png`);
      await expect(cartSheet).toHaveScreenshot(`populated-cart-sheet-${viewport.name}.png`);
      expectCleanRuntime(signals, '/product/prod-2');
    });
  });
}

test.describe('mobile customer orders recovery surface', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('customer order history remains readable and scrollable', async ({ page }) => {
    const signInSignals = await signInAsCustomer(page);
    const orderSignals = await visit(page, '/dashboard/client?tab=orders');
    const orderTable = page.getByRole('region', { name: 'Data table' });
    await expect(page.getByRole('heading', { name: 'Orders List' })).toBeVisible();
    await expect(orderTable).toBeVisible();
    await expect(page.getByText(/scroll to view more order details/i)).toBeVisible();
    await orderTable.scrollIntoViewIfNeeded();

    await expect(page).toHaveScreenshot('customer-orders-mobile.png');
    await expect(orderTable).toHaveScreenshot('customer-orders-table-mobile.png');
    expectCleanRuntime(signInSignals, '/?signin=true');
    expectCleanRuntime(orderSignals, '/dashboard/client?tab=orders');
  });
});
