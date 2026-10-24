import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

test.setTimeout(60_000);

/**
 * Scripted Buyer Path: header badge + cart side panel refresh from cartStore.
 *
 * Guards the #430 coordination change so chrome stays store-driven after
 * add/remove without depending on an update-cart event bus or data props.
 */
const warmMockApi = async (request: APIRequestContext) => {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const homeResponse = await request.get('/');
    if (!homeResponse.ok()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }

    const cartProbe = await request.post('/api/cart', {
      data: { productId: 'prod-2', quantity: 1 },
    });

    if (cartProbe.ok()) {
      await request.delete('/api/cart', {
        data: { products: ['prod-1', 'prod-2'] },
      });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Timed out waiting for mock API readiness before cart-chrome E2E');
};

const navigateTo = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
};

const addProductToCart = async (page: Page) => {
  const purchasePanel = page.getByTestId('product-purchase-panel');
  const addToCartButton = purchasePanel.getByRole('button', { name: /add to cart/i });
  await addToCartButton.scrollIntoViewIfNeeded();
  await expect(addToCartButton).toBeEnabled();

  const [cartPostResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'POST', {
      timeout: 20_000,
    }),
    addToCartButton.click(),
  ]);
  expect(cartPostResponse.ok()).toBe(true);
};

const openCartPanel = async (page: Page) => {
  await page.getByRole('button', { name: 'Open shopping cart' }).click();
  await expect(page.getByRole('heading', { name: /shopping cart/i })).toBeVisible();
};

test.describe('Scripted Buyer Path — cart chrome store refresh', () => {
  test.beforeAll(async ({ request }) => {
    await warmMockApi(request);
  });

  test.beforeEach(async ({ request }) => {
    await request.delete('/api/cart', {
      data: { products: ['prod-1', 'prod-2'] },
    });
  });

  test('header badge and cart panel refresh after add and remove', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await navigateTo(page, '/product/prod-2');
    await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();

    // Clear persisted Pinia cart so badge starts empty regardless of prior reviewer sessions.
    await page.request.delete('/api/cart', {
      data: { products: ['prod-1', 'prod-2'] },
    });
    await page.evaluate(() => localStorage.removeItem('cart-store'));
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).filter({ visible: true }).first()).toBeVisible();

    const cartButton = page.getByRole('button', { name: 'Open shopping cart' });
    const badge = cartButton.locator('span').first();

    await expect(badge).toHaveCSS('opacity', '0');

    await addProductToCart(page);

    await expect(badge).toHaveCSS('opacity', '1');
    await expect(badge).toHaveText('1');
    await expect(cartButton.getByText(/78\.40\sLei/)).toBeVisible();

    await openCartPanel(page);
    const cartSheet = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /shopping cart/i }) });
    await expect(cartSheet.getByText('ADM2587E RS-485 Transceiver', { exact: true })).toBeVisible();
    await expect(cartSheet.getByRole('link', { name: /go to checkout/i })).toBeVisible();

    const [deleteResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'DELETE', {
        timeout: 15_000,
      }),
      cartSheet.getByRole('button', { name: 'Remove item from cart' }).click(),
    ]);
    expect(deleteResponse.ok()).toBe(true);

    await expect(cartSheet.getByRole('link', { name: /start shopping/i })).toBeVisible();
    await expect(cartSheet.getByRole('heading', { name: /your cart is empty/i })).toBeVisible();
    await expect(cartSheet.getByText('ADM2587E RS-485 Transceiver', { exact: true })).toHaveCount(0);

    await cartSheet.getByRole('button', { name: 'Close shopping cart' }).click();
    await expect(badge).toHaveCSS('opacity', '0');
  });
});
