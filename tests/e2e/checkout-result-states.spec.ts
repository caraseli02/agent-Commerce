import { expect, test, type Page } from '@playwright/test';

test.setTimeout(60_000);

const navigateTo = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
};

const submitCustomerSignIn = async (page: Page) => {
  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await expect(signInButton).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
};

const signInThroughOrderSummary = async (page: Page) => {
  await navigateTo(page, '/order-summary');
  await page.getByRole('link', { name: /sign in to continue checkout/i }).click();
  await submitCustomerSignIn(page);
  await expect(page).toHaveURL(/\/order-summary$/);
};

const assertDirectFailRecovery = async (page: Page) => {
  await expect(page.getByRole('heading', { name: /no checkout failure details to show/i })).toBeVisible();
  await expect(page.getByText(/no data available/i)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /back to order summary/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /return to cart/i })).toBeVisible();
};

const assertDirectSuccessRecovery = async (page: Page) => {
  await expect(page.getByRole('heading', { name: /no order reference to confirm/i })).toBeVisible();
  await expect(page.getByText(/payment confirmed/i)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /back to order summary/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /return to cart/i })).toBeVisible();
};

const assertDisabledPaymentBoundary = async (page: Page) => {
  await expect(page.getByRole('heading', { name: /stripe checkout disabled in demo/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /pay now/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /back to order summary/i })).toBeEnabled();
  await expect(page.getByRole('button', { name: /back home/i })).toBeEnabled();
};

const assertDisabledSetupBoundary = async (page: Page) => {
  await expect(page.getByRole('heading', { name: /card setup disabled in demo/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /save now/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /back to settings/i })).toBeEnabled();
  await expect(page.getByRole('button', { name: /back home/i })).toBeEnabled();
};

test.describe('Checkout result states', () => {
  test.beforeEach(async ({ request }) => {
    await request.delete('/api/cart', {
      data: { products: ['prod-1', 'prod-2'] },
    });
  });

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`${viewport.name}: direct checkout fail and success routes show recovery instead of bare data`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await signInThroughOrderSummary(page);

      await navigateTo(page, '/checkout/fail');
      await assertDirectFailRecovery(page);

      await navigateTo(page, '/checkout/success');
      await assertDirectSuccessRecovery(page);
    });

    test(`${viewport.name}: disabled payment and card-setup screens expose enabled navigation`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await signInThroughOrderSummary(page);

      await navigateTo(page, '/checkout/session');
      await assertDisabledPaymentBoundary(page);

      await navigateTo(page, '/checkout/setup-card');
      await assertDisabledSetupBoundary(page);
    });
  }

  test('stateful checkout failure keeps order-specific recovery actions', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click();
    await navigateTo(page, '/order-summary');
    await page.getByRole('link', { name: /sign in to continue checkout/i }).click();
    await submitCustomerSignIn(page);

    await page.route('**/api/orders/new', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          description: 'Mock checkout failure',
        }),
      });
    });

    const secureCheckoutButton = page.getByRole('button', { name: /secure checkout/i });
    await Promise.all([page.waitForURL(/\/checkout\/fail/), secureCheckoutButton.click()]);

    await expect(page.getByRole('heading', { name: /payment failed/i })).toBeVisible();
    await expect(page.getByText(/unable to complete checkout|something went wrong/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: /cancel order/i })).toBeEnabled();
  });

  test('stateful checkout success keeps confirmed order details', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click();
    await navigateTo(page, '/order-summary');
    await page.getByRole('link', { name: /sign in to continue checkout/i }).click();
    await submitCustomerSignIn(page);

    const secureCheckoutButton = page.getByRole('button', { name: /secure checkout/i });
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/orders/new') && response.request().method() === 'POST'),
      page.waitForURL(/\/checkout\/success\?id=/),
      secureCheckoutButton.click(),
    ]);

    await expect(page.getByText(/payment confirmed/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible();
    await expect(page.getByText(/order reference/i)).toBeVisible();
    await expect(page.getByText(/total paid/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /view order details/i })).toBeVisible();
  });
});
