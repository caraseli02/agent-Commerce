import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Restored-cart header (#515): a returning shopper's persisted cart must not
 * cause hydration mismatches, and the first visible header cart count/total
 * must already be the restored values (never a stale or zero placeholder).
 */
const STOREFRONT_ROUTES = ['/', '/search?keyword=capacitor'] as const;
const CART_BUTTON = 'button[aria-label="Open shopping cart"]';

type HeaderSample = { count: string; badgeVisible: boolean; total: string; totalVisible: boolean };

const readHeaderCart = (page: Page) =>
  page.evaluate((selector) => {
    const button = document.querySelector(selector);
    const badge = button?.querySelector('span');
    const total = button?.querySelector(':scope > div:last-child > div');
    return { count: badge?.textContent?.trim() ?? '', total: total?.textContent?.trim() ?? '' };
  }, CART_BUTTON);

test.describe('Restored cart header', () => {
  test.beforeEach(async ({ request }) => {
    await request.delete('/api/cart', { data: { products: ['prod-2'] } });
  });

  test('persisted cart count and total hydrate cleanly and are correct when first visible', async ({ page }) => {
    await page.goto('/product/prod-2', { waitUntil: 'networkidle' });
    const cartPost = page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'POST');
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click();
    expect((await cartPost).ok()).toBe(true);
    await expect(page.locator(`${CART_BUTTON} span`)).toHaveText('1');

    const restored = await readHeaderCart(page);
    expect(restored.total).toMatch(/^[1-9][\d.]* Lei$/);

    // Sample the header cart every frame from the first paint of each reload.
    await page.addInitScript((selector) => {
      const samples: HeaderSample[] = [];
      (window as unknown as { __cartSamples: HeaderSample[] }).__cartSamples = samples;
      const sample = () => {
        const button = document.querySelector(selector);
        const badge = button?.querySelector('span');
        const total = button?.querySelector(':scope > div:last-child');
        if (badge && total) {
          samples.push({
            count: badge.textContent?.trim() ?? '',
            badgeVisible: Number(getComputedStyle(badge).opacity) > 0,
            total: total.querySelector('div')?.textContent?.trim() ?? '',
            totalVisible: getComputedStyle(total).visibility === 'visible' && getComputedStyle(total).display !== 'none',
          });
        }
        if (performance.now() < 5000) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, CART_BUTTON);

    for (const route of STOREFRONT_ROUTES) {
      const hydrationMessages: string[] = [];
      page.on('console', (message) => {
        if (/hydration|mismatch/i.test(message.text())) hydrationMessages.push(message.text());
      });

      await page.goto(route, { waitUntil: 'networkidle' });
      await expect(page.locator(`${CART_BUTTON} span`)).toHaveText(restored.count);
      await page.waitForTimeout(500);

      const samples = await page.evaluate(() => (window as unknown as { __cartSamples: HeaderSample[] }).__cartSamples);
      expect(samples.length, `header samples on ${route}`).toBeGreaterThan(0);
      for (const sample of samples.filter((entry) => entry.badgeVisible)) {
        expect(sample.count, `visible badge count on ${route}`).toBe(restored.count);
      }
      for (const sample of samples.filter((entry) => entry.totalVisible)) {
        expect(sample.total, `visible cart total on ${route}`).toBe(restored.total);
      }
      expect(samples.at(-1), `settled header cart on ${route}`).toMatchObject({ count: restored.count, badgeVisible: true });
      expect(await readHeaderCart(page)).toEqual(restored);
      expect(hydrationMessages, `hydration warnings on ${route} with restored cart`).toEqual([]);
      page.removeAllListeners('console');
    }
  });
});
