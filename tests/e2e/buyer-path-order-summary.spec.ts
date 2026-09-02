import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

test.setTimeout(60_000);

/**
 * Scripted Buyer Path: cart → order summary → checkout entry in mock mode.
 *
 * Protects the portfolio demo flow where a guest adds a product, reaches order
 * summary through the cart route, signs in, and can enter secure checkout.
 */
const warmMockApi = async (request: APIRequestContext) => {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const homeResponse = await request.get('/');
    if (!homeResponse.ok()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }

    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'customer@demo.com',
        password: 'customer123',
      },
    });
    const contentType = loginResponse.headers()['content-type'] ?? '';

    if (!loginResponse.ok() || !contentType.includes('application/json')) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }

    const login = (await loginResponse.json()) as { data?: { token?: string } };
    const authorization = `Bearer ${login.data?.token || ''}`;

    const cartProbe = await request.post('/api/cart', {
      headers: { authorization },
      data: { products: [{ id: 'prod-2', stock: 1, backorder_stock: 0, isFolder: false }] },
    });

    if (cartProbe.ok()) {
      await request.delete('/api/cart', {
        headers: { authorization },
        data: { products: ['prod-1', 'prod-2'] },
      });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Timed out waiting for mock API readiness before buyer-path E2E');
};

const navigateTo = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
};

const navigateThroughCart = async (page: Page) => {
  const cartNavigation = page.goto('/cart', { waitUntil: 'domcontentloaded' }).catch((error: unknown) => {
    if (!(error instanceof Error) || !error.message.includes('ERR_ABORTED')) {
      throw error;
    }
  });

  await Promise.all([cartNavigation, page.waitForURL(/\/order-summary$/)]);
};

const submitCustomerSignIn = async (page: Page) => {
  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await expect(signInButton).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
};

const addProductToCart = async (page: Page) => {
  const purchasePanel = page.getByTestId('product-purchase-panel');
  const addToCartButton = purchasePanel.getByRole('button', { name: /add to cart/i });
  await addToCartButton.scrollIntoViewIfNeeded();
  await expect(purchasePanel.getByRole('spinbutton')).toHaveValue('1');
  await expect(addToCartButton).toBeEnabled();

  const [cartPostResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'POST', { timeout: 20_000 }),
    addToCartButton.click(),
  ]);
  expect(cartPostResponse.ok()).toBe(true);
};

test.describe('Scripted Buyer Path — cart to checkout entry', () => {
  test.beforeAll(async ({ request }) => {
    await warmMockApi(request);
  });

  test.beforeEach(async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: 'customer@demo.com', password: 'customer123' },
    });
    const login = (await loginResponse.json()) as { data?: { token?: string } };
    await request.delete('/api/cart', {
      headers: { authorization: `Bearer ${login.data?.token || ''}` },
      data: { products: ['prod-1', 'prod-2'] },
    });
  });

  test('guest buyer reaches order summary from cart and can enter secure checkout after sign-in', async ({ page }) => {
    await navigateTo(page, '/product/prod-1');
    await expect(page.getByText('STM32F407VGT6 Microcontroller', { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await addProductToCart(page);

    await navigateThroughCart(page);
    await expect(page).toHaveURL(/\/order-summary$/);
    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    await expect(page.getByText('STM32F407VGT6 Microcontroller', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Viewing Summary as Guest/i)).toBeVisible();

    await expect(page.getByTestId('guest-address-prompt')).toBeVisible();
    await expect(page.getByTestId('checkout-as-guest')).toBeVisible();
    await expect(page.getByText('Order Type')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /shipping and billing/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /shipping preferences/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /payment method/i })).toHaveCount(0);
    await expect(page.getByTestId('billing-guest-empty')).toHaveCount(0);
    await expect(page.getByTestId('shipping-guest-empty')).toHaveCount(0);
    await expect(page.getByText('N/A', { exact: true })).toHaveCount(0);

    const paymentSummary = page.getByText('Payment Summary', { exact: true });
    await expect(paymentSummary).toBeVisible();
    // Order summary can render Subtotal/Total in cart chrome and summary panels.
    await expect(page.getByText('Subtotal', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('(VAT 19%)', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Total', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/^\d+\.\d{2} Lei$/).first()).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/\?signin=true&redirect=%2Forder-summary/),
      page.getByRole('link', { name: /sign in to continue checkout/i }).click(),
    ]);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    await submitCustomerSignIn(page);

    await expect(page).toHaveURL(/\/order-summary$/);
    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    await expect(page.getByText('STM32F407VGT6 Microcontroller', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Viewing Summary as Guest/i)).toHaveCount(0);
    await expect(page.getByText('949.99 Lei', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(paymentSummary.locator('../..').getByText('949.99 Lei', { exact: true })).toBeVisible();

    const secureCheckoutButton = page.getByRole('button', { name: /secure checkout/i });
    await expect(secureCheckoutButton).toBeVisible();
    await expect(secureCheckoutButton).toBeEnabled();
  });
});
