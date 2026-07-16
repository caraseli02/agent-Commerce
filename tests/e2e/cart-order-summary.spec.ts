import { expect, test, type Page } from '@playwright/test';

test.setTimeout(60_000);

const navigateTo = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
};

const addProductToCart = async (page: Page) => {
  const addToCartButton = page.getByRole('button', { name: /add to cart/i }).first();
  await addToCartButton.scrollIntoViewIfNeeded();
  await expect(addToCartButton).toBeEnabled();

  const cartPostPromise = page.waitForResponse(
    (response) => response.url().includes('/api/cart') && response.request().method() === 'POST'
  );
  await addToCartButton.click();
  expect((await cartPostPromise).ok()).toBe(true);
};

test.describe('Cart → Order Summary → Checkout Entry', () => {
  test('guest buyer can move from cart to order summary and reach checkout entry in mock mode', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await addProductToCart(page);

    await navigateTo(page, '/cart');
    await expect(page).toHaveURL(/\/order-summary$/);
    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    await expect(page.getByText(/Viewing Summary as Guest/i)).toBeVisible();
    await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();

    const signInToContinueCheckout = page.getByRole('link', { name: /sign in to continue checkout/i });
    await expect(signInToContinueCheckout).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/\?signin=true&redirect=%2Forder-summary/),
      signInToContinueCheckout.click(),
    ]);

    await expect(page).toHaveURL(/\/\?signin=true&redirect=%2Forder-summary/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });
});
