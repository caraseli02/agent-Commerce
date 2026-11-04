import { expect, test, type Page } from '@playwright/test';

/**
 * PDP stock comes from Inventory's uncached read, not catalog fixture stock (#842).
 * prod-1's fixture stock is 150; each test answers the availability read itself.
 */

const AVAILABILITY = '**/api/inventory/availability?*';

const answerAvailability = (page: Page, respond: () => { status: number; body: unknown }) =>
  page.route(AVAILABILITY, async (route) => {
    const { status, body } = respond();
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });

const available = (count: number) => ({
  status: 200,
  body: { status: 'success', data: [{ productId: 'prod-1', state: 'available', available: count }] },
});

const addToCart = (page: Page) => page.getByTestId('product-purchase-panel').getByRole('button', { name: /add to cart/i });

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test.describe(`PDP availability (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('shows a restock above fixture stock from Inventory', async ({ page }) => {
      await answerAvailability(page, () => available(900));
      await page.goto('/product/prod-1');

      await expect(page.getByTestId('product-purchase-panel').getByText('900 in stock').filter({ visible: true })).toBeVisible();
      await expect(addToCart(page)).toBeEnabled();
    });

    test('blocks immediate purchase when Inventory reports none left', async ({ page }) => {
      await answerAvailability(page, () => available(0));
      await page.goto('/product/prod-1');

      await expect(
        page
          .getByTestId('product-purchase-panel')
          .getByText(/backorder/i)
          .filter({ visible: true }),
      ).toBeVisible();
      await expect(addToCart(page)).toBeDisabled();
    });

    test('rechecks a zero count on the open page and unlocks a restock', async ({ page }) => {
      let count = 0;
      await answerAvailability(page, () => available(count));
      await page.goto('/product/prod-1');

      const panel = page.getByTestId('product-purchase-panel');
      await expect(panel.getByText(/backorder/i).filter({ visible: true })).toBeVisible();
      await expect(addToCart(page)).toBeDisabled();

      count = 900;
      await panel.getByRole('button', { name: 'Check stock again' }).click();
      await expect(panel.getByText('900 in stock').filter({ visible: true })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Check stock again' })).toHaveCount(0);
      await expect(addToCart(page)).toBeEnabled();

      const input = panel.getByRole('spinbutton', { name: 'Quantity' });
      await expect(input).toHaveAttribute('max', '900');
      await input.fill('20');
      await input.blur();
      await expect(panel.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('20');
      await expect(addToCart(page)).toBeEnabled();
    });

    test('blocks purchase while the read fails and recovers on retry', async ({ page }) => {
      let fail = true;
      await answerAvailability(page, () => (fail ? { status: 503, body: { statusMessage: 'down' } } : available(12)));
      await page.goto('/product/prod-1');

      const status = page.getByTestId('product-stock-status');
      await expect(status).toContainText('Stock could not be checked');
      await expect(page.getByTestId('product-purchase-panel').getByText('150 in stock')).toHaveCount(0);
      await expect(addToCart(page)).toBeDisabled();

      fail = false;
      await status.getByRole('button', { name: 'Try again' }).click();
      await expect(page.getByTestId('product-purchase-panel').getByText('12 in stock').filter({ visible: true })).toBeVisible();
      await expect(addToCart(page)).toBeEnabled();
    });

    test('rereads after adding to cart, so a competing hold shows up', async ({ page }) => {
      let count = 5;
      await answerAvailability(page, () => available(count));
      await page.goto('/product/prod-1');
      await expect(page.getByTestId('product-purchase-panel').getByText('5 in stock').filter({ visible: true })).toBeVisible();

      // Another buyer reserves units while this page is open.
      count = 2;
      await addToCart(page).click();
      await expect(page.getByTestId('product-purchase-panel').getByText('2 in stock').filter({ visible: true })).toBeVisible();
    });
  });
}
