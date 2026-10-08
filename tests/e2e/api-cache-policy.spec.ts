import { expect, test } from '@playwright/test';
import type { APIResponse } from '@playwright/test';

const expectPrivate = (response: APIResponse) => {
  const headers = response.headers();
  expect(headers['cache-control']).toBe('private, no-store, max-age=0, must-revalidate');
  expect(headers['cdn-cache-control']).toBe('no-store');
  expect(headers['vercel-cdn-cache-control']).toBe('no-store');
};

test('built Nitro applies private headers to guest/authenticated reads, mutations and failures', async ({ request }) => {
  const catalog = await request.get('/api/products/prod-2');
  expect(catalog.ok()).toBe(true);
  expect(catalog.headers()['cache-control']).toBeUndefined();
  expect(catalog.headers()['cdn-cache-control']).toBeUndefined();
  expect(catalog.headers()['vercel-cdn-cache-control']).toBeUndefined();

  const guestCart = await request.get('/api/cart');
  expect(guestCart.ok()).toBe(true);
  expectPrivate(guestCart);

  const invalidLogin = await request.post('/api/auth/login', { data: { email: 'invalid@demo.com', password: 'invalid' } });
  expect(invalidLogin.status()).toBe(401);
  expectPrivate(invalidLogin);

  const login = await request.post('/api/auth/login', { data: { email: 'customer@demo.com', password: 'customer123' } });
  expect(login.ok()).toBe(true);
  expectPrivate(login);
  const { token } = await login.json();
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };

  for (const path of [
    '/api/cart',
    '/api/user',
    '/api/orders',
    '/api/dashboard/client/metadata',
    '/api/prices/price-settings',
    '/api/notification',
  ]) {
    const response = await request.get(path, { headers });
    expect(response.ok(), path).toBe(true);
    expectPrivate(response);
  }
  const missingOrder = await request.get('/api/orders/cache-policy-missing', { headers });
  expect(missingOrder.status()).toBe(404);
  expectPrivate(missingOrder);

  const pricing = await request.post('/api/orders/price', { headers, data: { products: [] } });
  expectPrivate(pricing);
  const checkout = await request.post('/api/checkout/validate', { headers, data: {} });
  expectPrivate(checkout);
});

test('private headers preserve guest cart and its merge after browser sign-in', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || /hydration/i.test(message.text())) errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('/product/prod-2', { waitUntil: 'networkidle' });
  const add = page.getByRole('button', { name: /add to cart/i }).first();
  await expect(add).toBeEnabled();
  const [cartResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'POST'),
    add.click(),
  ]);
  expect(cartResponse.ok()).toBe(true);
  expect(cartResponse.headers()['cache-control']).toContain('no-store');

  await page.goto('/order-summary', { waitUntil: 'networkidle' });
  await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('link', { name: /sign in to continue checkout/i }).click();
  const [loginResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    page
      .locator('button')
      .filter({ hasText: /^\s*Sign In\s*$/ })
      .click(),
  ]);
  expect(loginResponse.ok()).toBe(true);
  expect(loginResponse.headers()['cache-control']).toContain('no-store');
  await expect(page).toHaveURL(/\/order-summary$/);
  await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(/Viewing Summary as Guest/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /secure checkout/i })).toBeEnabled();
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('signed-in-cart.png'), fullPage: true });
});
