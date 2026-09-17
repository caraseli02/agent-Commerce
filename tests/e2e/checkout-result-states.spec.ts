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
    await expect(secureCheckoutButton).toBeEnabled();
    await Promise.all([page.waitForURL(/\/checkout\/fail/), secureCheckoutButton.click()]);

    await expect(page.getByRole('heading', { name: /payment failed/i })).toBeVisible();
    await expect(page.getByText(/unable to complete checkout|something went wrong/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeEnabled();
    await expect(page.getByRole('button', { name: /cancel order/i })).toBeEnabled();
  });

  test('an empty cart failure sends the buyer back to a cart review instead of calling it a payment failure', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click();
    await navigateTo(page, '/order-summary');
    await page.getByRole('link', { name: /sign in to continue checkout/i }).click();
    await submitCustomerSignIn(page);

    await page.route('**/api/orders/new', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ data: { code: 'cart_empty', message: 'An empty cart cannot be checked out.' } }),
      });
    });

    const secureCheckoutButton = page.getByRole('button', { name: /secure checkout/i });
    await expect(secureCheckoutButton).toBeEnabled();
    await Promise.all([page.waitForURL(/\/checkout\/fail/), secureCheckoutButton.click()]);

    await expect(page.getByRole('heading', { name: /your cart is empty/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /review cart/i })).toBeEnabled();
    await expect(page.getByRole('heading', { name: /payment failed/i })).toHaveCount(0);
  });

  test('a refresh with a removed saved card requires the buyer to choose payment again', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click();
    await signInThroughOrderSummary(page);
    await expect(page.getByRole('button', { name: /secure checkout/i })).toBeEnabled();

    await page.evaluate(() => {
      sessionStorage.setItem('checkout-draft-v1', JSON.stringify({ paymentDetails: { type: 0, cardId: 'card-removed-by-user' } }));
    });
    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.getByRole('button', { name: /secure checkout/i })).toBeDisabled();
    await page.getByRole('button', { name: /pay by card/i }).click();
    await expect(page.getByRole('button', { name: /secure checkout/i })).toBeEnabled();
  });

  test('signing out clears the checkout contact and address draft before another buyer can sign in', async ({ page }) => {
    await signInThroughOrderSummary(page);
    await page.evaluate(() => {
      sessionStorage.setItem(
        'checkout-draft-v1',
        JSON.stringify({
          guestContact: { firstName: 'Buyer A', email: 'buyer-a@example.com' },
          shippingDetails: { address: { name1: 'A' } },
        }),
      );
    });

    await page.getByRole('button', { name: /open my account/i }).click();
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('checkout-draft-v1'))).toBeNull();
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
    await expect(secureCheckoutButton).toBeEnabled();
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
