import { expect, test } from '@playwright/test';

const signInAsCustomer = async (page: import('@playwright/test').Page) => {
  await page.goto('/?signin=true', { waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: 'Customer Demo' }).click();
  await expect(page.getByLabel('E-mail or client code')).toHaveValue('customer@demo.com');
  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await expect(signInButton).toBeVisible();
  await signInButton.click();
  await expect(page).toHaveURL(/\/dashboard\/client\?tab=home/);
};

/** Content box (border box minus padding-inline) of the first element matching `selector`. */
const contentBox = (page: import('@playwright/test').Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const left = rect.left + parseFloat(style.paddingLeft);
      const right = rect.right - parseFloat(style.paddingRight);
      return { left, right, width: right - left };
    });

/**
 * #764: the client dashboard content follows the header and footer `container`
 * edges below 2xl (1440px here, `--breakpoint-2xl`), and keeps its 1328px
 * content box inside the header edges at 2xl and wider.
 */
test.describe('Client dashboard width', () => {
  for (const width of [1024, 1200, 1280, 1440, 1536]) {
    test(`content aligns with the header container at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signInAsCustomer(page);
      await expect(page.getByRole('heading', { name: 'My account', level: 1 })).toBeVisible();

      const header = await contentBox(page, '[data-mobile-main-row] .container');
      const dashboard = await contentBox(page, '[data-testid="client-dashboard-content"]');
      const scroll = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));

      expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.innerWidth);
      expect(dashboard.left).toBeGreaterThanOrEqual(header.left - 1);
      expect(dashboard.right).toBeLessThanOrEqual(header.right + 1);
      if (width >= 1440) expect(Math.abs(dashboard.width - 1328)).toBeLessThanOrEqual(1);
      else expect(Math.abs(dashboard.width - header.width)).toBeLessThanOrEqual(1);
    });
  }
});
