import { expect, test } from '@playwright/test';

type PrintTestWindow = Window & {
  __printCalls: number[];
  print: () => void;
};

/**
 * Tier 1 Critical Flow: Browse → Product Detail
 *
 * Verifies that a user can reach a product detail page and see the
 * essential information (name, price, stock, add-to-cart action).
 * This is the entry point of the purchase journey.
 */

test.describe('Browse → Product Detail', () => {
  test('user can view product details from a direct product URL', async ({ page }) => {
    await page.goto('/product/prod-1');

    // Product name is visible
    await expect(page.getByText('STM32F407VGT6 Microcontroller', { exact: true })).toBeVisible();

    // Price tiers are displayed
    await expect(page.getByText('999.99').first()).toBeVisible();
    await expect(page.getByText('979.99').first()).toBeVisible();
    await expect(page.getByText('959.99').first()).toBeVisible();

    // Stock information is shown
    await expect(page.getByText(/150 in stock/i).first()).toBeVisible();

    // Add to cart button is present and actionable
    const addToCartButtons = page.getByRole('button', { name: /add to cart/i });
    await expect(addToCartButtons.first()).toBeVisible();
  });

  test('print action triggers window.print from the desktop entry point', async ({ page }) => {
    await page.goto('/product/prod-1');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const testWindow = window as unknown as PrintTestWindow;
      testWindow.__printCalls = [];
      testWindow.print = () => {
        testWindow.__printCalls.push(Date.now());
      };
    });

    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')];
      buttons.find((button) => button.textContent?.trim() === 'Print this page')?.click();
    });

    await expect.poll(async () => {
      return page.evaluate(() => {
        const testWindow = window as unknown as PrintTestWindow;
        return testWindow.__printCalls.length;
      });
    }).toBe(1);
  });

  test('print action triggers window.print from the mobile dropdown entry point', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/product/prod-1');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const testWindow = window as unknown as PrintTestWindow;
      testWindow.__printCalls = [];
      testWindow.print = () => {
        testWindow.__printCalls.push(Date.now());
      };
    });

    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')];
      buttons.find((button) => button.textContent?.trim() === 'Product actions')?.click();
    });

    await page.waitForFunction(() => {
      const items = [...document.querySelectorAll('[role="menuitem"]')] as HTMLElement[];
      return items.some(
        (item) =>
          item.textContent?.trim() === 'Print this page' && !!(item.offsetWidth || item.offsetHeight || item.getClientRects().length)
      );
    });

    await page.evaluate(() => {
      const items = [...document.querySelectorAll('[role="menuitem"]')] as HTMLElement[];
      items.find((item) => item.textContent?.trim() === 'Print this page')?.click();
    });

    await expect.poll(async () => {
      return page.evaluate(() => {
        const testWindow = window as unknown as PrintTestWindow;
        return testWindow.__printCalls.length;
      });
    }).toBe(1);
  });

  test('ask about product email validation shows invalid styling and clears on valid submit', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/product/prod-1', { waitUntil: 'networkidle' });

    const askButton = page.getByRole('button', { name: 'Ask about the product' });
    await expect(askButton).toBeVisible();
    await askButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const emailInput = dialog.getByLabel('Email Address');
    await expect(emailInput).toBeVisible();

    const submitButton = dialog.getByRole('button', { name: /^Submit$/ });
    await expect(submitButton).toBeVisible();

    await submitButton.click();

    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(emailInput).toHaveClass(/border-red-500/);
    await expect(emailInput).toHaveCSS('border-color', 'rgb(255, 50, 50)');
    await expect(dialog.getByText('Required')).toBeVisible();

    await emailInput.fill('not-an-email');
    await submitButton.click();

    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(emailInput).toHaveClass(/border-red-500/);
    await expect(emailInput).toHaveCSS('border-color', 'rgb(255, 50, 50)');
    await expect(dialog.getByText('Invalid email address')).toBeVisible();

    await emailInput.fill('buyer@example.com');
    await submitButton.click();

    await expect(emailInput).not.toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByText('Invalid email address')).toHaveCount(0);
  });

  test('product page shows technical specifications table', async ({ page }) => {
    await page.goto('/product/prod-1');

    // Specifications heading
    await expect(page.getByRole('button', { name: /specifications/i })).toBeVisible();

    // Technical specs from ParametricData
    await expect(page.getByRole('cell', { name: 'Core' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ARM Cortex-M4' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Flash' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '1024' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'SRAM' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '192' })).toBeVisible();
  });

  test('product page shows breadcrumbs navigation', async ({ page }) => {
    await page.goto('/product/prod-1');

    await expect(page.getByRole('link', { name: 'Semiconductors' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Microcontrollers' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ARM Cortex-M4' })).toBeVisible();
  });
});
