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

const signInWithCustomerDemo = async (page: Page) => {
  const customerRole = page.getByRole('radio', { name: 'Customer Demo' });
  await expect(customerRole).toBeVisible();
  await customerRole.click();

  await expect(page.getByLabel('E-mail or client code')).toHaveValue('customer@demo.com');

  const signInButton = page.getByRole('button', { name: /^\s*Sign In\s*$/ });
  await expect(signInButton).toBeVisible();

  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
};

test.describe('Cart → Order Summary → Checkout Entry', () => {
  test.beforeEach(async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'customer@demo.com',
        password: 'customer123',
      },
    });

    const loginJson = (await loginResponse.json()) as { token?: string; data?: { token?: string } };
    const token = loginJson.token || loginJson.data?.token;

    if (token) {
      await request.delete('/api/cart', {
        data: { products: ['prod-1', 'prod-2'] },
        headers: { authorization: 'Bearer ' + token },
      });
    }
  });

  test('guest buyer can move from cart to order summary and enter checkout in mock mode', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await addProductToCart(page);

    await navigateTo(page, '/cart');
    await expect(page).toHaveURL(/\/order-summary$/);
    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    await expect(page.getByText(/Viewing Summary as Guest/i)).toBeVisible();
    await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await Promise.all([
      page.waitForURL(/signin=true&redirect=/),
      page.getByRole('link', { name: /sign in to continue checkout/i }).click(),
    ]);

    await signInWithCustomerDemo(page);

    await expect(page).toHaveURL(/\/order-summary$/);
    await expect(page.getByText(/Viewing Summary as Guest/i)).toHaveCount(0);

    const secureCheckoutButton = page.getByRole('button', { name: /secure checkout/i });
    await expect(secureCheckoutButton).toBeEnabled();

    const placeOrderResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/orders/new') && response.request().method() === 'POST'
    );
    const checkoutSuccessPromise = page.waitForURL(/\/checkout\/success\?id=/);

    await secureCheckoutButton.click();

    const placeOrderResponse = await placeOrderResponsePromise;
    expect(placeOrderResponse.ok()).toBe(true);

    const placeOrderJson = (await placeOrderResponse.json()) as { status?: string; data?: { orderId?: string } };
    const orderId = placeOrderJson.data?.orderId;

    expect(placeOrderJson.status).toBe('success');
    expect(orderId).toMatch(/^ord-/);

    await checkoutSuccessPromise;
    await expect(page).toHaveURL(new RegExp(`/checkout/success\\?id=${orderId}$`));
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible();
    await expect(page.getByText(/payment confirmed/i)).toBeVisible();
    await expect(page.getByText(/order reference/i)).toBeVisible();
  });
});
