import { expect, test, type Page } from '@playwright/test';

const fillGuestCheckoutForm = async (page: Page) => {
  await page.locator('#guest-first-name').fill('Jane');
  await page.locator('#guest-last-name').fill('Doe');
  await page.locator('#guest-email').fill('jane.guest@example.com');
  await page.locator('#guest-phone').fill('+15550100');
  await page.locator('#shipping-line-1').fill('123 Market Street');
  await page.locator('#shipping-city').fill('San Francisco');
  await page.locator('#shipping-region').fill('California');
  await page.locator('#shipping-postcode').fill('94105');
  await page.locator('#shipping-country').fill('US');
};

test.describe('Guest checkout flow', () => {
  test.beforeEach(async ({ request }) => {
    await request.delete('/api/cart', {
      data: { products: ['prod-1', 'prod-2'] },
    });
  });

  test('guest can complete checkout without signing in', async ({ page }) => {
    await page.goto('/product/prod-2', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();

    const addToCartButton = page.getByRole('button', { name: /add to cart/i }).first();
    await addToCartButton.click();
    await page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'POST');

    await page.goto('/order-summary', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Viewing Summary as Guest/i)).toBeVisible();
    await expect(page.getByTestId('guest-address-prompt')).toBeVisible();

    await page.getByTestId('checkout-as-guest').click();
    await expect(page.getByText(/Checking out as Guest/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /shipping and billing/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /shipping preferences/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /payment method/i })).toBeVisible();
    await expect(page.getByTestId('payment-management')).toHaveCount(0);

    await fillGuestCheckoutForm(page);

    const secureCheckoutButton = page.getByRole('button', { name: /secure checkout/i });
    await expect(secureCheckoutButton).toBeEnabled();

    const [placeOrderResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/orders/new') && response.request().method() === 'POST'),
      page.waitForURL(/\/checkout\/success\?id=/),
      secureCheckoutButton.click(),
    ]);

    const placeOrderJson = (await placeOrderResponse.json()) as { status?: string; data?: { orderId?: string } };
    expect(placeOrderJson.status).toBe('success');
    expect(placeOrderJson.data?.orderId).toMatch(/^ord-/);
    await expect(page.getByText(/payment confirmed/i)).toBeVisible();
  });
});
