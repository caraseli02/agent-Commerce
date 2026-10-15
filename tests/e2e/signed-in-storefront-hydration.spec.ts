import { expect, test } from '@playwright/test';
import { expectCleanRuntime, signInAsCustomer, visit } from '../playwright-support/runtime';

// #693: SSR used to render guest prices while the client hydrated with the signed-in customer's
// discount, so every signed-in storefront page logged a hydration mismatch.
test.describe('signed-in storefront hydration', () => {
  test('renders customer pricing on the server and hydrates without mismatches', async ({ page }) => {
    await signInAsCustomer(page);

    for (const route of ['/', '/search?keyword=STM32', '/product/prod-1']) {
      const signals = await visit(page, route);
      expectCleanRuntime(signals, route);
    }

    // Without the persisted userDetails, the cookie session alone must give the same result.
    await page.evaluate(() => localStorage.removeItem('auth-store'));
    const signals = await visit(page, '/product/prod-1');
    expectCleanRuntime(signals, '/product/prod-1 (cookie only)');
    await expect(page.getByText('949.99 Lei').locator('visible=true').first()).toBeVisible();

    // An older persisted snapshot (here a 10% discount) must not override the server's current 5%.
    await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('auth-store') ?? '{}');
      stored.userDetails.adminSettings.discount.value = 10;
      localStorage.setItem('auth-store', JSON.stringify(stored));
    });
    const staleSignals = await visit(page, '/product/prod-1');
    expectCleanRuntime(staleSignals, '/product/prod-1 (stale persisted details)');
    await expect(page.getByText('949.99 Lei').locator('visible=true').first()).toBeVisible();
  });
});
