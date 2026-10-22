import { expect, test, type Page } from '@playwright/test';
import { disableMotion, expectCleanRuntime, preparePopulatedCart, signInAsCustomer, visit } from '../playwright-support/runtime';

const VIEWPORTS = [
  { name: 'mobile', size: { width: 390, height: 844 } },
  { name: 'desktop', size: { width: 1440, height: 900 } },
] as const;

// Light keeps its original screenshot names. Dark adds a `-dark` infix and takes only
// full-page shots. Test titles stay identical so scripts/select-visual-checks.mjs
// selects both schemes for an area.
const SCHEMES = [
  { name: 'light', infix: '', elementShots: true },
  { name: 'dark', infix: '-dark', elementShots: false },
] as const;

type Scheme = (typeof SCHEMES)[number];

// Fails loudly if color-mode falls back to light under dark emulation.
const expectScheme = async (page: Page, scheme: Scheme) => {
  if (scheme.name === 'dark') await expect(page.locator('html')).toHaveClass(/\bdark\b/);
};

for (const scheme of SCHEMES) {
  const label = scheme.name === 'light' ? '' : `${scheme.name} `;

  test.describe(`${label}visual recovery`, () => {
    test.use({ colorScheme: scheme.name });

    test.beforeEach(async ({ page }) => {
      await disableMotion(page, { colorScheme: scheme.name });
    });

    for (const viewport of VIEWPORTS) {
      const shot = (base: string) => `${base}${scheme.infix}-${viewport.name}.png`;

      test.describe(`${viewport.name} ${label}storefront recovery matrix`, () => {
        test.use({ viewport: viewport.size });

        test('homepage preserves header and merchandising', async ({ page }) => {
          const signals = await visit(page, '/');
          await expect(page.getByRole('banner')).toBeVisible();
          await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
          await expectScheme(page, scheme);

          await expect(page).toHaveScreenshot(shot('home'));
          if (scheme.elementShots) await expect(page.getByRole('banner')).toHaveScreenshot(shot('home-header'));
          expectCleanRuntime(signals, '/');
        });

        test('populated search preserves its result card', async ({ page }) => {
          const signals = await visit(page, '/search?keyword=STM32');
          const productLink = page.getByRole('link', { name: 'STM32F407VGT6 Microcontroller', exact: true }).first();
          await expect(productLink).toBeVisible();
          const productCard = productLink.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');
          await expectScheme(page, scheme);

          await expect(page).toHaveScreenshot(shot('search-stm32'));
          if (scheme.elementShots) await expect(productCard).toHaveScreenshot(shot('search-result-card'));
          expectCleanRuntime(signals, '/search?keyword=STM32');
        });

        test('product detail preserves its purchase controls', async ({ page }) => {
          const signals = await visit(page, '/product/prod-1');
          await expect(page.getByRole('heading', { level: 1, name: 'STM32F407VGT6 Microcontroller' })).toBeVisible();
          const purchasePanel = page.getByTestId('product-purchase-panel');
          await expect(purchasePanel).toBeVisible();
          await expectScheme(page, scheme);

          await expect(page).toHaveScreenshot(shot('product-detail'));
          if (scheme.elementShots) await expect(purchasePanel).toHaveScreenshot(shot('product-purchase-panel'));
          expectCleanRuntime(signals, '/product/prod-1');
        });

        test('populated cart preserves checkout entry', async ({ page }) => {
          const { cartSheet, signals } = await preparePopulatedCart(page);
          await expectScheme(page, scheme);

          await expect(page).toHaveScreenshot(shot('populated-cart'));
          if (scheme.elementShots) await expect(cartSheet).toHaveScreenshot(shot('populated-cart-sheet'));
          expectCleanRuntime(signals, '/product/prod-2');
        });
      });
    }

    test.describe(`mobile ${label}customer orders recovery surface`, () => {
      test.use({ viewport: { width: 390, height: 844 } });

      test('customer order history remains readable and scrollable', async ({ page }) => {
        const signInSignals = await signInAsCustomer(page);
        const orderSignals = await visit(page, '/dashboard/client?tab=orders');
        const orderTable = page.getByRole('region', { name: 'Data table' });
        await expect(page.getByRole('heading', { name: 'Orders List' })).toBeVisible();
        await expect(orderTable).toBeVisible();
        await expect(page.getByText(/scroll to view more order details/i)).toBeVisible();
        await orderTable.scrollIntoViewIfNeeded();
        await expectScheme(page, scheme);

        await expect(page).toHaveScreenshot(`customer-orders${scheme.infix}-mobile.png`);
        if (scheme.elementShots) await expect(orderTable).toHaveScreenshot('customer-orders-table-mobile.png');
        expectCleanRuntime(signInSignals, '/?signin=true');
        expectCleanRuntime(orderSignals, '/dashboard/client?tab=orders');
      });
    });
  });
}
