import { expect, test, type APIRequestContext } from '@playwright/test';

test.setTimeout(60_000);

const warmMockApi = async (request: APIRequestContext) => {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const homeResponse = await request.get('/');
    if (!homeResponse.ok()) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }

    const cartProbe = await request.post('/api/cart', {
      data: {
        products: [{ id: 'prod-2', stock: 1, isFolder: false }],
      },
    });

    if (cartProbe.ok()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Timed out waiting for mock API readiness before demo-reset E2E');
};

test.describe('demo reset control', () => {
  test.beforeEach(async ({ request }) => {
    await warmMockApi(request);
    await request.post('/api/cart', {
      data: {
        products: [{ id: 'prod-2', stock: 2, isFolder: false }],
      },
    });
  });

  test('cancels reset without changing cart state', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const trigger = page.getByTestId('reset-demo-data-trigger');
    await expect(trigger).toBeVisible();
    await trigger.click();

    await expect(page.getByTestId('reset-demo-data-cancel')).toBeVisible();
    await page.getByTestId('reset-demo-data-cancel').click();

    const cartResponse = await request.get('/api/cart');
    expect(cartResponse.ok()).toBeTruthy();
    const cart = (await cartResponse.json()) as { data: { products: Array<{ id: string }> } };
    expect(cart.data.products.some((product) => product.id === 'prod-2')).toBe(true);
  });

  test('resets cart to the documented seed for the current browser session', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.getByTestId('reset-demo-data-trigger').click();
    await page.getByTestId('reset-demo-data-confirm').click();

    await expect(page.getByRole('status')).toContainText('Demo data restored');

    const cartResponse = await page.request.get('/api/cart');
    expect(cartResponse.ok()).toBeTruthy();
    const cart = (await cartResponse.json()) as { data: { products: Array<{ id: string; stock: number }> } };
    expect(cart.data.products).toHaveLength(1);
    expect(cart.data.products[0]?.id).toBe('prod-1');
    expect(cart.data.products[0]?.stock).toBe(1);
  });

  test('keeps a separate browser session isolated after reset', async ({ browser }) => {
    const isolatedContext = await browser.newContext();
    const isolatedRequest = isolatedContext.request;

    await warmMockApi(isolatedRequest);
    await isolatedRequest.post('/api/cart', {
      data: {
        products: [{ id: 'prod-2', stock: 3, isFolder: false }],
      },
    });

    const page = await browser.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('reset-demo-data-trigger').click();
    await page.getByTestId('reset-demo-data-confirm').click();
    await expect(page.getByRole('status')).toContainText('Demo data restored');

    const isolatedCartResponse = await isolatedRequest.get('/api/cart');
    const isolatedCart = (await isolatedCartResponse.json()) as { data: { products: Array<{ id: string }> } };
    expect(isolatedCart.data.products.some((product) => product.id === 'prod-2')).toBe(true);

    await isolatedContext.close();
  });
});
