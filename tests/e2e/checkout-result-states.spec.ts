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

const addProductToCart = async (page: Page) => {
  const button = page.getByRole('button', { name: /add to cart/i }).first();
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().includes('/api/cart') && candidate.request().method() === 'POST'),
    button.click(),
  ]);
  expect(response.ok()).toBe(true);
};

const signInThroughOrderSummary = async (page: Page) => {
  await navigateTo(page, '/order-summary');
  // An empty cart offers the empty-state sign-in link; a cart with items offers the checkout one.
  await page.getByRole('link', { name: /sign in to (continue checkout|see your saved cart)/i }).click();
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

const assertClearedFailureContext = async (page: Page) => {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = JSON.parse(localStorage.getItem('cart-store') ?? '{}');
        return { previousCheckoutError: state.previousCheckoutError, orderClientSecret: state.orderClientSecret };
      }),
    )
    .toEqual({ previousCheckoutError: null, orderClientSecret: null });
};

const assertDisabledPaymentBoundary = async (page: Page) => {
  await expect(page.getByRole('heading', { name: /card payments are temporarily unavailable/i })).toBeVisible();
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
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: 'customer@demo.com', password: 'customer123' },
    });
    const loginPayload = (await loginResponse.json()) as { token?: string; data?: { token?: string } };
    const token = loginPayload.token || loginPayload.data?.token;
    if (token) {
      await request.delete('/api/cart', {
        headers: { authorization: `Bearer ${token}` },
        data: { products: ['prod-1', 'prod-2'] },
      });
    }
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
    await addProductToCart(page);
    await navigateTo(page, '/order-summary');
    // An empty cart offers the empty-state sign-in link; a cart with items offers the checkout one.
    await page.getByRole('link', { name: /sign in to (continue checkout|see your saved cart)/i }).click();
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
    await addProductToCart(page);
    await navigateTo(page, '/order-summary');
    // An empty cart offers the empty-state sign-in link; a cart with items offers the checkout one.
    await page.getByRole('link', { name: /sign in to (continue checkout|see your saved cart)/i }).click();
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

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    for (const scenario of [
      { code: 'cart_changed', title: 'Your cart changed', action: 'Review updated cart' },
      { code: 'quote_changed', title: 'Your checkout price changed', action: 'Review updated cart' },
      { code: 'payment_recovery_required', title: 'Checkout needs review', action: 'Review checkout' },
      { code: 'unrecognized_provider_code', title: 'Payment failed', action: 'Try again' },
    ]) {
      test(`${viewport.name}: public contract ${scenario.code} has safe failure recovery`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await navigateTo(page, '/product/prod-2');
        await addProductToCart(page);
        await signInThroughOrderSummary(page);
        await page.evaluate(() => {
          const state = JSON.parse(localStorage.getItem('cart-store') ?? '{}');
          localStorage.setItem('cart-store', JSON.stringify({ ...state, orderClientSecret: 'stale-demo-secret' }));
        });
        await page.reload({ waitUntil: 'networkidle' });
        await page.route('**/api/orders/new', async (route) => {
          if (route.request().method() !== 'POST') return route.continue();
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { code: scenario.code, message: 'Internal provider diagnostic must not choose buyer actions' },
            }),
          });
        });
        await page.getByRole('button', { name: /secure checkout/i }).click();
        await expect(page).toHaveURL(/\/checkout\/fail/);
        await expect(page.getByRole('heading', { name: scenario.title, exact: true })).toBeVisible();
        await expect(page.getByText('Internal provider diagnostic must not choose buyer actions', { exact: false })).toHaveCount(0);
        const action = page.getByRole('button', { name: scenario.action, exact: true });
        await expect(action).toBeEnabled();
        await page.screenshot({ path: `/tmp/commerce-583-browser/${viewport.name}-${scenario.code}.png`, fullPage: true });
        await action.click();
        await expect(page).toHaveURL(/\/order-summary$/);
        await assertClearedFailureContext(page);
      });
    }
  }

  test('public contract unknown persisted failure with an order ID does not cancel on ordinary navigation', async ({ page }) => {
    await signInThroughOrderSummary(page);
    await page.evaluate(() => {
      localStorage.setItem(
        'cart-store',
        JSON.stringify({
          previousCheckoutError: { code: 'future_provider_code', message: 'Private diagnostic' },
          orderClientSecret: 'stale-demo-secret',
        }),
      );
    });
    const cancellations: string[] = [];
    await page.route('**/api/orders/**', async (route) => {
      if (route.request().url().includes('/cancel')) cancellations.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
    });
    await navigateTo(page, '/checkout/fail?id=unknown-order');
    await expect(page.getByRole('heading', { name: 'Payment failed', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Components Marketplace home', exact: true }).first().click();
    await expect(page).toHaveURL(/\/$/);
    expect(cancellations).toEqual([]);
    await assertClearedFailureContext(page);
  });

  for (const { exit, status } of [
    { exit: 'home', status: 200 },
    { exit: 'cancel', status: 200 },
    { exit: 'home', status: 503 },
    { exit: 'cancel', status: 503 },
    { exit: 'home', status: 401 },
  ]) {
    test(`public contract known failure ${exit} exit attempts cancellation once and clears local context (${status})`, async ({ page }) => {
      await signInThroughOrderSummary(page);
      await page.evaluate(() =>
        localStorage.setItem(
          'cart-store',
          JSON.stringify({
            previousCheckoutError: { code: 'card_declined' },
            orderClientSecret: 'stale-demo-secret',
          }),
        ),
      );
      const cancellations: string[] = [];
      await page.route('**/api/orders/known-order/cancel', async (route) => {
        cancellations.push(route.request().url());
        await route.fulfill({
          // Bound the old redirect/re-entry bug: a second request fails normally rather than recursing forever.
          status: status === 401 && cancellations.length > 1 ? 503 : status,
          contentType: 'application/json',
          body: JSON.stringify(status === 200 ? { status: 'success' } : { statusMessage: 'Simulated cancellation outage' }),
        });
      });
      await navigateTo(page, '/checkout/fail?id=known-order');
      await expect(page.getByRole('heading', { name: 'Payment failed', exact: true })).toBeVisible();
      if (exit === 'cancel') await page.getByRole('button', { name: 'Cancel order', exact: true }).click();
      else await page.getByRole('link', { name: 'Components Marketplace home', exact: true }).first().click();
      await expect(page).toHaveURL(status === 401 ? /\/\?signin=true$/ : exit === 'cancel' ? /\/dashboard\/client$/ : /\/$/);
      expect(cancellations).toHaveLength(1);
      await assertClearedFailureContext(page);
    });
  }

  test('a refresh with a removed saved card requires the buyer to choose payment again', async ({ page }) => {
    await navigateTo(page, '/product/prod-2');
    await addProductToCart(page);
    await signInThroughOrderSummary(page);
    await expect(page.getByRole('button', { name: /secure checkout/i })).toBeEnabled();

    await page.evaluate(() => {
      sessionStorage.setItem('checkout-draft-v1', JSON.stringify({ paymentDetails: { type: 0, cardId: 'card-removed-by-user' } }));
    });
    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.getByRole('button', { name: /secure checkout/i })).toBeDisabled();
    await expect(page.getByRole('alert').filter({ hasText: /selected payment method is no longer available/i })).toBeVisible();
    await page.getByRole('button', { name: /pay by card/i }).click();
    await expect(page.getByRole('alert').filter({ hasText: /selected payment method is no longer available/i })).toHaveCount(0);
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
    await addProductToCart(page);
    await navigateTo(page, '/order-summary');
    // An empty cart offers the empty-state sign-in link; a cart with items offers the checkout one.
    await page.getByRole('link', { name: /sign in to (continue checkout|see your saved cart)/i }).click();
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
