import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.setTimeout(60_000);

/**
 * Tier 1 Critical Flow: Product Detail → Checkout Confirmation
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
    (response) => response.url().includes('/api/cart') && response.request().method() === 'POST',
  );
  await addToCartButton.click();
  const cartPostResponse = await cartPostPromise;
  expect(cartPostResponse.ok()).toBe(true);
};

test.describe('Product Detail → Checkout Confirmation', () => {
  test.beforeEach(async ({ request }) => {
    const resetProducts = ['prod-1', 'prod-2'];
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@demo.com',
        password: 'admin123',
      },
    });
    const loginJson = (await loginResponse.json()) as { token?: string; data?: { token?: string } };
    const token = loginJson.token || loginJson.data?.token;

    if (token) {
      await request.delete('/api/cart', {
        data: { products: resetProducts },
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    await request.delete('/api/cart', {
      data: { products: resetProducts },
    });
  });

  test('guest customer can complete the mock purchase journey from product detail to checkout success', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await addProductToCart(page);

    await navigateTo(page, '/order-summary');
    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    await expectProductInSummary(page);
    await expect(page.getByText(/Viewing Summary as Guest/i)).toBeVisible();

    await page.getByRole('link', { name: /sign in to continue checkout/i }).click();
    await expect(page).toHaveURL(/redirect=(%2F|\/)order-summary/);

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
    await expect(page.getByRole('heading', { name: /payment failed/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeEnabled();
  });

  test('requires a fresh review when another tab changes the cart before checkout', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await addProductToCart(page);
    await navigateTo(page, '/order-summary');
    await page.getByRole('link', { name: /sign in to continue checkout/i }).click();

    const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
    const loginResponse = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
      signInButton.click(),
    ]).then(([response]) => response);
    const loginPayload = (await loginResponse.json()) as { data?: { token?: string } };
    const token = loginPayload.data?.token;
    expect(token).toBeTruthy();
    await expect(page).toHaveURL(/\/order-summary$/);

    const secureCheckoutButton = page.getByRole('button', { name: /secure checkout/i });
    await expect(secureCheckoutButton).toBeEnabled();

    const cartChange = await page.request.post('/api/cart', {
      headers: { authorization: `Bearer ${token}` },
      data: { products: [{ id: 'prod-1', stock: 1, isFolder: false }] },
    });
    expect(cartChange.ok()).toBe(true);

    await expect(secureCheckoutButton).toBeEnabled();
    const [placeOrderResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/orders/new') && response.request().method() === 'POST'),
      page.waitForURL(/\/checkout\/fail/),
      secureCheckoutButton.click(),
    ]);

    expect(placeOrderResponse.status()).toBe(409);
    await expect(page.getByRole('heading', { name: /your cart changed/i })).toBeVisible();
    await expect(page.getByText(/review the updated items and total/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /review updated cart/i })).toBeEnabled();
    expect(page.url()).not.toMatch(/\/checkout\/success/);
  });
});
