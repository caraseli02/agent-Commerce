import { expect, test } from '@playwright/test';

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

/**
 * Tier 1 Critical Flow: Order History / Account View
 *
 * Verifies a signed-in customer can reach their account orders tab in the real
 * browser and see order history content without being blocked by auth redirects.
 */
test.describe('Order History / Account View', () => {
  test('new durable order displays its saved identity and truthful fulfillment on both layouts', async ({ page }) => {
    const hydrationMessages: string[] = [];
    page.on('console', (message) => {
      if (/hydration|mismatch/i.test(message.text())) hydrationMessages.push(message.text());
    });
    const token = await signInAsCustomer(page);
    const headers = { authorization: `Bearer ${token}` };
    await page.request.delete('/api/cart', { headers, data: { products: ['prod-1', 'prod-2'] } });
    const cartResponse = await page.request.post('/api/cart', {
      headers,
      data: { products: [{ id: 'prod-1', stock: 1, isFolder: false }] },
    });
    expect(cartResponse.ok()).toBe(true);
    const cart = (await cartResponse.json()).data;
    const orderResponse = await page.request.post('/api/orders/new', {
      headers,
      data: {
        cartId: cart._id,
        checkoutRequestId: `order-display-${Date.now()}`,
        type: 0,
        shippingDetails: { address: { name1: 'QA demo' }, billingAddress: { name1: 'QA demo' } },
        paymentDetails: { type: 0 },
        notes: [],
      },
    });
    expect(orderResponse.ok()).toBe(true);
    const { orderId } = (await orderResponse.json()).data;
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`/order-summary/${orderId}`, { waitUntil: 'networkidle' });
      await expect(page.getByText('STM32F407VGT6 Microcontroller', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('MCU-001', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Not available', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('16', { exact: true })).toHaveCount(0);
    }
    expect(hydrationMessages).toEqual([]);
  });

  test('signed-in customer can view account order history', async ({ page }) => {
    await signInAsCustomer(page);

    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/orders') && response.request().method() === 'GET'),
      page.goto('/dashboard/client?tab=orders'),
    ]);

    await expect(page).toHaveURL(/\/dashboard\/client\?tab=orders/);
    await expect(page.getByText(/active orders/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /orders list/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ORD-2024-0001/i }).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const table = page.getByRole('region', { name: 'Data table' });
    const scrollHint = page.getByText(/scroll to view more order details/i);
    await expect(table).toBeVisible();
    await expect(scrollHint).toBeVisible();
    await page.getByTestId('virtualized-table-scroll').evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect(scrollHint).toHaveCount(0);
  });
});
