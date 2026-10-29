import { expect, test, type Page } from '@playwright/test';

test.setTimeout(60_000);

const openCheckout = async (page: Page, buyer: string) => {
  if (buyer === 'signed-in') {
    const login = await page.request.post('/api/auth/login', { data: { email: 'customer@demo.com', password: 'customer123' } });
    const payload = await login.json();
    const token = payload.token || payload.data?.token;
    await page.request.delete('/api/cart', { headers: { authorization: `Bearer ${token}` }, data: { products: ['prod-2'] } });
  }
  await page.request.post('/api/cart', { data: { products: [{ id: 'prod-2', stock: 1, isFolder: false }] } });
  await page.goto('/order-summary');
  if (buyer === 'signed-in') {
    await page.getByRole('link', { name: /sign in to continue checkout/i }).click();
    await page.getByRole('button', { name: /^Sign In$/ }).click();
    await expect(page).toHaveURL(/\/order-summary$/);
  } else {
    await page.getByTestId('checkout-as-guest').click();
    for (const [id, value] of Object.entries({
      'guest-first-name': 'Jane',
      'guest-last-name': 'Doe',
      'guest-email': 'jane.guest@example.com',
      'guest-phone': '+15550100',
      'shipping-line-1': '123 Market Street',
      'shipping-city': 'San Francisco',
      'shipping-region': 'California',
      'shipping-postcode': '94105',
      'shipping-country': 'US',
    }))
      await page.locator(`#${id}`).fill(value);
  }
  await expect(page.getByRole('button', { name: /secure checkout/i })).toBeEnabled();
};

for (const buyer of ['guest', 'signed-in']) {
  for (const width of [390, 1440]) {
    test(`${buyer} ${width}px keeps non-card choices visible disabled and routes card checkout to its session`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await openCheckout(page, buyer);
      if (!(await page.getByRole('button', { name: /Bank Transfer/i }).isVisible())) {
        await page.getByRole('button', { name: /payment method/i }).click();
      }
      for (const name of [/Bank Transfer/i, /Cash on delivery/i, /Pay from credit/i]) {
        const option = page.getByRole('button', { name });
        await expect(option).toBeVisible();
        await expect(option).toBeDisabled();
        await expect(option).toContainText('Temporarily unavailable');
      }
      await expect
        .poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('checkout-draft-v1') || '{}').paymentDetails?.type))
        .toBe(0);
      const card = page.getByRole('button', { name: /pay (?:with a new|by) card/i }).first();
      await expect(card).toBeEnabled();
      await card.click();
      await testInfo.attach('payment-methods', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      await testInfo.attach('payment-aria', { body: await page.locator('main').ariaSnapshot(), contentType: 'text/plain' });
      // The live provider is exercised separately on Preview; this isolates the browser routing contract.
      await page.route('**/api/orders/new', async (route) => {
        expect(route.request().postDataJSON().paymentDetails.type).toBe(0);
        await route.fulfill({ json: { status: 'success', data: { orderId: 'ord-card-only', status: 0, paymentSession: true } } });
      });
      await page.getByRole('button', { name: /secure checkout/i }).click();
      await expect(page).toHaveURL(/\/checkout\/session\?id=ord-card-only/);
      expect(errors).toEqual([]);
    });
  }

  for (const type of [1, 2, 3]) {
    test(`${buyer} stale type ${type} requires card reselection`, async ({ page }) => {
      await openCheckout(page, buyer);
      await page.evaluate((paymentType) => {
        const draft = JSON.parse(sessionStorage.getItem('checkout-draft-v1') || '{}');
        draft.paymentDetails = { type: paymentType };
        sessionStorage.setItem('checkout-draft-v1', JSON.stringify(draft));
      }, type);
      await page.reload();
      await expect(page.getByRole('alert').filter({ hasText: /choose a card to continue/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /secure checkout/i })).toBeDisabled();
      await page
        .getByRole('button', { name: /pay (?:with a new|by) card/i })
        .first()
        .click();
      await expect(page.getByRole('button', { name: /secure checkout/i })).toBeEnabled();
    });
  }
}
