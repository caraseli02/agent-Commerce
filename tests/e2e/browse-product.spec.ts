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
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') runtimeErrors.push(message.text());
    });

    await page.goto('/product/prod-1');

    // Product name is visible
    await expect(page.getByRole('heading', { level: 1, name: 'STM32F407VGT6 Microcontroller' })).toBeVisible();

    // Price tiers are displayed
    await expect(page.getByText('999.99').first()).toBeVisible();
    await expect(page.getByText('979.99').first()).toBeVisible();
    await expect(page.getByText('959.99').first()).toBeVisible();

    // Stock information is shown
    await expect(page.getByText(/150 in stock/i).first()).toBeVisible();

    // Add to cart button is present and actionable
    const addToCartButtons = page.getByRole('button', { name: /add to cart/i });
    await expect(addToCartButtons.first()).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  });

  test('copy and quantity controls handle keyboard and invalid numeric input', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/product/prod-1', { waitUntil: 'networkidle' });

    const copyButton = page.getByRole('button', { name: 'Copy STM32F407VGT6 Microcontroller' });
    await copyButton.focus();
    await copyButton.press('Enter');
    await expect(page.getByText('Text copied!', { exact: true })).toBeVisible();

    const quantityInput = page.getByRole('spinbutton', { name: 'Quantity' });
    await quantityInput.fill('10.5');
    await quantityInput.press('Tab');
    await expect(quantityInput).toHaveValue('1');
    await expect(quantityInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('rapid add-to-cart activation creates one cart mutation', async ({ page }) => {
    let cartPostCount = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/cart') && request.method() === 'POST') cartPostCount += 1;
    });

    await page.goto('/product/prod-1', { waitUntil: 'networkidle' });

    const quantityInput = page.getByRole('spinbutton', { name: 'Quantity' });
    await expect(quantityInput).toHaveValue('1');
    await page.getByRole('button', { name: 'Increase Quantity' }).click();
    await expect(quantityInput).toHaveValue('2');

    const updateCartButton = page.getByRole('button', { name: 'Add to cart — selected quantity' });
    const cartPostResponse = page.waitForResponse(
      (response) => response.url().includes('/api/cart') && response.request().method() === 'POST',
    );
    await updateCartButton.dblclick();
    await cartPostResponse;

    await expect.poll(() => cartPostCount).toBe(1);
    await expect(updateCartButton).toBeDisabled();

    const cartResponse = await page.request.get('/api/cart');
    const cartJson = (await cartResponse.json()) as { data?: { products?: Array<{ id?: string; stock?: number }> } };
    expect(cartJson.data?.products?.find((product) => product.id === 'prod-1')?.stock).toBe(2);
  });

  test('mobile PDP enables Add to cart at qty 1 when product is not in cart', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/product/prod-2', { waitUntil: 'networkidle' });

    // Stale persisted cart must not disable Add — clear server + local, then poison localStorage.
    await page.request.delete('/api/cart', {
      data: { products: ['prod-2'] },
    });
    await page.evaluate(() => {
      localStorage.setItem(
        'cart-store',
        JSON.stringify({
          cart: {
            products: [{ id: 'prod-2', stock: 1, backorder_stock: 0, isFolder: false }],
          },
        }),
      );
    });
    await page.reload({ waitUntil: 'networkidle' });

    const purchasePanel = page.getByTestId('product-purchase-panel');
    const quantityInput = purchasePanel.getByRole('spinbutton', { name: 'Quantity' });
    const cartButton = purchasePanel.getByRole('button', { name: 'Add to cart — selected quantity' });

    await quantityInput.scrollIntoViewIfNeeded();
    await expect(quantityInput).toHaveValue('1');
    await expect(cartButton).toContainText(/Add to cart/i);
    await expect(cartButton).toBeEnabled();
    await expect(purchasePanel.getByTestId('cart-qty-unchanged-hint')).not.toBeVisible();

    const firstAdd = page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'POST');
    await cartButton.click();
    await firstAdd;

    await expect(cartButton).toContainText(/Update cart/i);
    await expect(cartButton).toBeDisabled();
    await expect(quantityInput).toHaveValue('1');
    const unchangedHint = purchasePanel.getByTestId('cart-qty-unchanged-hint');
    await expect(unchangedHint).toBeVisible();
    await expect(unchangedHint).toHaveText('Already in your cart (qty 1)');

    await purchasePanel.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(quantityInput).toHaveValue('2');
    await expect(cartButton).toBeEnabled();
    await expect(unchangedHint).not.toBeVisible();

    const cartResponse = await page.request.get('/api/cart');
    const cartJson = (await cartResponse.json()) as { data?: { products?: Array<{ id?: string; stock?: number }> } };
    expect(cartJson.data?.products?.find((product) => product.id === 'prod-2')?.stock).toBe(1);
  });

  test('mobile PDP quantity stepper and Update cart work after cart sync', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/product/prod-1', { waitUntil: 'networkidle' });

    // Clear guest cart using the page session cookie (request fixture is a different jar).
    await page.request.delete('/api/cart', {
      data: { products: ['prod-1'] },
    });
    await page.evaluate(() => localStorage.removeItem('cart-store'));
    await page.reload({ waitUntil: 'networkidle' });

    const purchasePanel = page.getByTestId('product-purchase-panel');
    const quantityInput = purchasePanel.getByRole('spinbutton', { name: 'Quantity' });
    const increase = purchasePanel.getByRole('button', { name: 'Increase quantity' });
    const cartButton = purchasePanel.getByRole('button', { name: 'Add to cart — selected quantity' });

    await quantityInput.scrollIntoViewIfNeeded();
    await expect(quantityInput).toHaveValue('1');
    await expect(cartButton).toBeEnabled();
    await expect(cartButton).toContainText(/Add to cart/i);

    await increase.click();
    await expect(quantityInput).toHaveValue('2');

    const firstAdd = page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'POST');
    await cartButton.click();
    await firstAdd;

    await expect(cartButton).toBeDisabled();
    await expect(cartButton).toContainText(/Update cart/i);
    const unchangedHint = purchasePanel.getByTestId('cart-qty-unchanged-hint');
    await expect(unchangedHint).toBeVisible();
    await expect(unchangedHint).toHaveText('Already in your cart (qty 2)');

    // After cart sync, +/- must still work (regression: stale local qty blocked increases).
    await increase.click();
    await expect(quantityInput).toHaveValue('3');
    await expect(cartButton).toBeEnabled();
    await expect(unchangedHint).not.toBeVisible();

    const updateAdd = page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'POST');
    await cartButton.click();
    await updateAdd;

    await expect(cartButton).toBeDisabled();
    await expect(quantityInput).toHaveValue('3');
    await expect(unchangedHint).toBeVisible();
    await expect(unchangedHint).toHaveText('Already in your cart (qty 3)');

    const cartResponse = await page.request.get('/api/cart');
    const cartJson = (await cartResponse.json()) as { data?: { products?: Array<{ id?: string; stock?: number }> } };
    expect(cartJson.data?.products?.find((product) => product.id === 'prod-1')?.stock).toBe(3);
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

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const testWindow = window as unknown as PrintTestWindow;
          return testWindow.__printCalls.length;
        });
      })
      .toBe(1);
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
          item.textContent?.trim() === 'Print this page' && !!(item.offsetWidth || item.offsetHeight || item.getClientRects().length),
      );
    });

    await page.evaluate(() => {
      const items = [...document.querySelectorAll('[role="menuitem"]')] as HTMLElement[];
      items.find((item) => item.textContent?.trim() === 'Print this page')?.click();
    });

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const testWindow = window as unknown as PrintTestWindow;
          return testWindow.__printCalls.length;
        });
      })
      .toBe(1);
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

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Enquiry saved for this demo', { exact: true })).toBeVisible();
  });

  test('product page shows technical specifications table', async ({ page }) => {
    await page.goto('/product/prod-1');

    // Specifications heading
    await expect(page.getByRole('button', { name: /specifications/i })).toBeVisible();

    // Technical specs from ParametricData
    await expect(page.getByRole('cell', { name: 'Core', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ARM Cortex-M4' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Flash', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: '1024' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'SRAM', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: '192' })).toBeVisible();

    const coreCheckbox = page.getByRole('checkbox', { name: 'Include Core in similar-product search' });
    await coreCheckbox.focus();
    await coreCheckbox.press('Space');
    await expect(coreCheckbox).toBeChecked();
  });

  test('similar-product selection preserves results after search navigation', async ({ page }) => {
    await page.goto('/product/prod-1');
    // The specifications table is server-rendered; wait for client hydration before toggling it.
    await page.waitForTimeout(1_000);

    const coreCheckbox = page.getByRole('checkbox', { name: 'Include Core in similar-product search' });
    await coreCheckbox.focus();
    await coreCheckbox.press('Space');
    await expect(coreCheckbox).toBeChecked();
    const similarProducts = page.getByRole('button', { name: /Show similar products/ });
    await expect(similarProducts).toBeEnabled();

    await similarProducts.click();
    await expect(page).toHaveURL(/\/search\?similar=true/);
    await expect(page.getByText(/Products Found \([1-9]\d*\)/).last()).toBeVisible();
  });

  test('product page shows breadcrumbs navigation', async ({ page }) => {
    await page.goto('/product/prod-1');

    await expect(page.getByRole('link', { name: 'Semiconductors' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Microcontrollers' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ARM Cortex-M4' })).toBeVisible();
  });

  test('missing product slug shows an explicit error state with retry and catalog CTA', async ({ page }) => {
    await page.goto('/product/not-a-real-product-slug');

    await expect(page.getByRole('alert')).toContainText('We could not load this product');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse catalog' })).toBeVisible();
  });
});
