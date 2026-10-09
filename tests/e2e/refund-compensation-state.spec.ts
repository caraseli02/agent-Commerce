import { expect, test } from '@playwright/test';
import { Pool } from 'pg';
import { normalizePostgresConnectionString } from '../../server/infrastructure/postgres-connection-string.mjs';

const signInAsCustomer = async (page: import('@playwright/test').Page) => {
  await page.goto('/?signin=true', { waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: 'Customer Demo' }).click();
  await expect(page.getByLabel('E-mail or client code')).toHaveValue('customer@demo.com');
  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await expect(signInButton).toBeVisible();
  const [loginResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
  await expect(page).toHaveURL(/\/dashboard\/client\?tab=home/);
  return (await loginResponse.json()).data.token as string;
};

// Signed PostgreSQL tests prove the transition. This built-browser check proves
// its persisted paid/canceled/held projection reaches the actual buyer consumer.
test('refund settlement and bank-return recovery render paid history with canceled/held fulfillment', async ({ page }) => {
  const token = await signInAsCustomer(page);
  const headers = { authorization: `Bearer ${token}` };
  await page.request.delete('/api/cart', { headers, data: { products: ['prod-1', 'prod-2'] } });
  const cartResponse = await page.request.post('/api/cart', {
    headers,
    data: { products: [{ id: 'prod-1', stock: 1, isFolder: false }] },
  });
  expect(cartResponse.ok()).toBe(true);
  const cart = (await cartResponse.json()).data;
  const priceResponse = await page.request.post('/api/orders/price', {
    headers,
    data: { order: { cartId: cart._id } },
  });
  expect(priceResponse.ok()).toBe(true);
  const review = (await priceResponse.json()).data.review as { cartRevision: string; quoteFingerprint: string };
  const orderResponse = await page.request.post('/api/orders/new', {
    headers,
    data: {
      cartId: cart._id,
      reviewedCartRevision: review.cartRevision,
      reviewedQuoteFingerprint: review.quoteFingerprint,
      checkoutRequestId: `order-display-${Date.now()}`,
      type: 0,
      shippingDetails: { address: { name1: 'QA demo' }, billingAddress: { name1: 'QA demo' } },
      paymentDetails: { type: 0 },
      notes: [],
    },
  });
  expect(orderResponse.ok()).toBe(true);
  const { orderId } = (await orderResponse.json()).data;
  const db = new Pool({ connectionString: normalizePostgresConnectionString(process.env.DATABASE_URL!), max: 1 });
  try {
    const { rows } = await db.query('SELECT payload_json FROM checkout_orders WHERE id=$1', [orderId]);
    const payload = JSON.parse(rows[0].payload_json);
    payload.order.paymentDetails.status = 1;
    for (const status of ['Canceled', 'On Hold']) {
      payload.order.status = status;
      await db.query('UPDATE checkout_orders SET payload_json=$1 WHERE id=$2', [JSON.stringify(payload), orderId]);
      for (const viewport of [
        { width: 1280, height: 800 },
        { width: 390, height: 844 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto(`/order-summary/${orderId}`, { waitUntil: 'networkidle' });
        await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible();
        const response = await page.request.get(`/api/orders/${orderId}`, { headers });
        expect(response.ok()).toBe(true);
        const persisted = (await response.json()).data.order;
        expect(persisted.status).toBe(status);
        expect(persisted.paymentDetails.status).toBe(1);
      }
    }
  } finally {
    await db.end();
  }
});
