import { expect, test, type Page } from '@playwright/test';

test.setTimeout(60_000);

/**
 * Scripted Buyer Path: cart → order summary → checkout entry in mock mode.
 *
 * Verifies the demo purchase journey can move from a product page through the
 * order summary, customer sign-in, secure checkout, and confirmed runtime order.
 */
const navigateTo = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
};

const submitCustomerSignIn = async (page: Page) => {
  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await expect(signInButton).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
};

const expectProductInSummary = async (page: Page) => {
  await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();
};

const addProductToCart = async (page: Page) => {
  const addToCartButton = page.getByRole('button', { name: /add to cart/i }).first();
  await addToCartButton.scrollIntoViewIfNeeded();
  await expect(addToCartButton).toBeEnabled();

  const cartPostPromise = page.waitForResponse(
    (response) => response.url().includes('/api/cart') && response.request().method() === 'POST'
  );
  await addToCartButton.click();
  const cartPostResponse = await cartPostPromise;
  expect(cartPostResponse.ok()).toBe(true);
};

test.describe('Cart → Order Summary → Checkout Entry', () => {
  test.beforeEach(async ({ request }) => {
    await request.delete('/api/cart', {
      data: { products: ['prod-1', 'prod-2'] },
    });
  });

  test('guest buyer can complete the mock purchase journey from cart to checkout success', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await addProductToCart(page);

    await navigateTo(page, '/cart');
    await expect(page).toHaveURL(/\/order-summary$/);
    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    await expectProductInSummary(page);
    await expect(page.getByText(/Viewing Summary as Guest/i)).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/\?signin=true&redirect=%2Forder-summary/),
      page.getByRole('link', { name: /sign in to continue checkout/i }).click(),
    ]);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    await submitCustomerSignIn(page);

    await expect(page).toHaveURL(/\/order-summary$/);
    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    await expectProductInSummary(page);
    await expect(page.getByText(/Viewing Summary as Guest/i)).toHaveCount(0);

    const secureCheckoutButton = page.getByRole('button', { name: /secure checkout/i });
    await expect(secureCheckoutButton).toBeEnabled();
    const [placeOrderResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/orders/new') && response.request().method() === 'POST'),
      page.waitForURL(/\/checkout\/success\?id=/),
      secureCheckoutButton.click(),
    ]);
    const placeOrderJson = (await placeOrderResponse.json()) as { status?: string; data?: { orderId?: string } };
    const orderId = placeOrderJson.data?.orderId;

    expect(orderId).toBeDefined();
    expect(orderId).toBeTruthy();
    expect(placeOrderJson.status).toBe('success');
    expect(orderId).toMatch(/^ord-/);
    expect(page.url()).toContain(`/checkout/success?id=${orderId}`);
    await page.waitForResponse((response) => response.url().includes(`/api/orders/${orderId}`) && response.request().method() === 'GET');
    await expect(page.getByText(/payment confirmed/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible();
    await expect(page.getByText(/order reference/i)).toBeVisible();
    await expect(page.getByText(/total paid/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /view order details/i })).toBeVisible();
  });

  test('signed-in customer is routed to checkout failure when order placement fails', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await addProductToCart(page);

    await navigateTo(page, '/order-summary');
    await page.getByRole('link', { name: /sign in to continue checkout/i }).click();
    await submitCustomerSignIn(page);
    await expect(page).toHaveURL(/\/order-summary$/);

    await page.route('**/api/orders/new', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          description: 'Mock checkout failure',
        }),
      });
    });

    const secureCheckoutButton = page.getByRole('button', { name: /secure checkout/i });
    await expect(secureCheckoutButton).toBeEnabled();
    await Promise.all([page.waitForURL(/\/checkout\/fail/), secureCheckoutButton.click()]);
    await expect(page).toHaveURL(/\/checkout\/fail/);
    await expect(page.getByText(/no data available/i)).toBeVisible();
  });
});
