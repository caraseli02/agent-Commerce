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

const closeBetaDialog = async (page: Page) => {
  const betaNotice = page.getByText(/currently in beta testing/i);
  const closeButton = page.getByRole('button', { name: /^close$/i });
  await closeButton.waitFor({ state: 'visible', timeout: 3_000 }).catch(() => undefined);
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
    await expect(betaNotice).toBeHidden();
  }
};

const submitCustomerSignIn = async (page: Page) => {
  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await expect(signInButton).toBeVisible();
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
};

const expectProductInSummary = async (page: Page) => {
  await expect(page.getByText('Professional Laptop Ultra', { exact: true }).filter({ visible: true }).first()).toBeVisible();
};

const addProductToCart = async (page: Page) => {
  const addToCartButton = page.getByRole('button', { name: /add to cart/i }).first();
  await addToCartButton.scrollIntoViewIfNeeded();
  await expect(addToCartButton).toBeEnabled();

  const cartPostPromise = page.waitForResponse(
    response => response.url().includes('/api/cart') && response.request().method() === 'POST',
  );
  await addToCartButton.click();
  const cartPostResponse = await cartPostPromise;
  expect(cartPostResponse.ok()).toBe(true);
};

test.describe('Product Detail → Checkout Confirmation', () => {
  test.beforeEach(async ({ context, request }) => {
    const resetProducts = ['prod-1', 'prod-2'];
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@ecas.com',
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

    await context.addCookies([
      {
        name: 'appSettings',
        value: encodeURIComponent(JSON.stringify({ showAppInBeta: false })),
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('guest customer can complete the mock purchase journey from product detail to checkout success', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await closeBetaDialog(page);
    await expect(page.getByText('Professional Laptop Ultra', { exact: true }).filter({ visible: true }).first()).toBeVisible();

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
      page.waitForResponse(response => response.url().includes('/api/orders/new') && response.request().method() === 'POST'),
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
    await page.waitForResponse(
      response => response.url().includes(`/api/orders/${orderId}`) && response.request().method() === 'GET',
    );
    await expect(page.getByText(/payment confirmed/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible();
    await expect(page.getByText(/order reference/i)).toBeVisible();
    await expect(page.getByText(/total paid/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /view order details/i })).toBeVisible();
  });
});
