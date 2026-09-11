import { expect, test } from '@playwright/test';

const PUBLIC_REVIEWER_ROUTES = ['/', '/search?keyword=capacitor', '/?signin=true', '/order-summary'] as const;

function collectHydrationMessages(page: import('@playwright/test').Page) {
  const hydrationMessages: string[] = [];

  page.on('console', (message) => {
    const text = message.text();
    if (/hydration|Hydration|mismatch/i.test(text)) {
      hydrationMessages.push(text);
    }
  });

  return hydrationMessages;
}

test.describe('Public reviewer route hydration', () => {
  test('expired session with a persisted profile keeps signed-out footer links and clean hydration', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-store', JSON.stringify({ userDetails: { _id: 'mock-customer-1', role: 'customer' } }));
    });
    const hydrationMessages = collectHydrationMessages(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('footer').getByRole('link', { name: 'Sign in to demo' })).toBeVisible();
    expect(hydrationMessages).toEqual([]);
  });

  test('route sweep has no hydration mismatch warnings', async ({ page }) => {
    for (const route of PUBLIC_REVIEWER_ROUTES) {
      const hydrationMessages = collectHydrationMessages(page);
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      expect(hydrationMessages, `hydration warnings on ${route}`).toEqual([]);
    }
  });

  test('route sweep stays clean when persisted cart state exists', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'cart-store',
        JSON.stringify({
          cart: {
            _id: 'cart-1',
            products: [
              {
                id: 'p1',
                stock: 1,
                initialUnitPrice: 999.99,
                unitPriceAfterDiscounts: 999.99,
                subtotal: 999.99,
                total: 999.99,
                productEntity: { stock: 100 },
              },
            ],
          },
        }),
      );
    });

    for (const route of PUBLIC_REVIEWER_ROUTES) {
      const hydrationMessages = collectHydrationMessages(page);
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      expect(hydrationMessages, `hydration warnings on ${route} with persisted cart`).toEqual([]);
    }
  });
});
