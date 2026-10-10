import { expect, test, type Page } from '@playwright/test';

// Deterministic SDK boundary double. This proves ECAS browser sequencing and
// presentation, not real Stripe sandbox confirmation or a bank's 3DS challenge.
const fakeStripe = `
window.__paymentTest = { confirms: 0, submits: 0, mode: 'success', options: null };
window.Stripe = function () {
  return {
    _registerWrapper() {},
    elements(options) {
      window.__paymentTest.options = options;
      return {
        submit: async () => {
          window.__paymentTest.submits++;
          if (window.__paymentTest.mode === 'slow-submit') await new Promise(resolve => window.__paymentTest.releaseSubmit = resolve);
          return window.__paymentTest.mode === 'validation-error' ? { error: { type: 'validation_error' } } : {};
        },
        create(type, options) {
          window.__paymentTest.elementOptions = options;
          const listeners = {};
          let host;
          return {
            on(name, fn) { listeners[name] = fn; },
            mount(node) {
              host = node;
              host.innerHTML = '<label>Test card <input data-testid="mock-stripe-card" autocomplete="off" /></label>';
              host.querySelector('input').addEventListener('input', () => listeners.change?.({ complete: true }));
              setTimeout(() => listeners.ready?.(), 0);
            },
            destroy() { if (host) host.innerHTML = ''; },
          };
        },
      };
    },
    async confirmPayment(options) {
      window.__paymentTest.confirms++;
      window.__paymentTest.confirmOptions = { returnUrl: options.confirmParams.return_url, redirect: options.redirect };
      if (window.__paymentTest.mode === '3ds') await new Promise(resolve => {
        const challenge = document.createElement('div');
        challenge.setAttribute('role', 'dialog');
        challenge.setAttribute('aria-label', 'Test bank authentication');
        challenge.innerHTML = '<button>Complete test authentication</button>';
        document.body.appendChild(challenge);
        challenge.querySelector('button').onclick = () => { challenge.remove(); resolve(); };
      });
      return window.__paymentTest.mode === 'decline' ? { error: { type: 'card_error' } } : { paymentIntent: { status: 'succeeded' } };
    },
  };
};`;
const action = {
  status: 'success',
  data: { kind: 'requires-action', nextAction: { type: 'client-secret', clientSecret: 'pi_test_secret_browser' } },
};
const response = (kind: string) => ({ status: 'success', data: { kind } });
const json = (value: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
const setup = async (page: Page) => {
  const errors: string[] = [];
  const requests: { path: string; body: string | null }[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('/api/orders/')) requests.push({ path: new URL(request.url()).pathname, body: request.postData() });
  });
  await page.route('https://js.stripe.com/**', (route) => route.fulfill({ contentType: 'application/javascript', body: fakeStripe }));
  await page.route('**/api/orders/ord-ui/resume-payment', (route) => route.fulfill(json(action)));
  await page.route('**/api/orders/ord-ui/refresh-payment', (route) => route.fulfill(json(response('pending'))));
  return { errors, requests };
};
const fillCard = async (page: Page) => {
  await page.getByTestId('mock-stripe-card').fill('4242424242424242');
  await expect(page.getByRole('button', { name: 'Pay by card', exact: true })).toBeEnabled();
};
const confirms = (page: Page) =>
  page.evaluate(() => (window as unknown as { __paymentTest?: { confirms: number } }).__paymentTest?.confirms ?? 0);

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`${viewport.width}px: keeps checkout visible and disabled during resume and return reconciliation`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const { errors } = await setup(page);
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/orders/ord-ui/resume-payment', async (route) => {
      await hold;
      await route.fulfill(json(action));
    });
    await page.goto('/checkout/session?id=ord-ui');
    await expect(page.getByRole('heading', { name: 'Checking your order…' })).toBeVisible();
    await expect(page.getByText('Order ord-ui', { exact: true })).toBeVisible();
    await expect(page.getByTestId('payment-form')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Checking your order…' })).toBeDisabled();
    expect(await confirms(page)).toBe(0);
    release();
    await fillCard(page);
    await page.reload();
    await expect(page.getByTestId('mock-stripe-card')).toBeVisible();
    let refreshRelease!: () => void;
    const refreshHold = new Promise<void>((resolve) => {
      refreshRelease = resolve;
    });
    await page.route('**/api/orders/ord-ui/refresh-payment', async (route) => {
      await refreshHold;
      await route.fulfill(json(response('pending')));
    });
    await page.goto('/checkout/session?id=ord-ui&returned=1&payment_intent_client_secret=untrusted-secret&redirect_status=succeeded');
    await expect(page.getByRole('button', { name: 'Checking your order…' })).toBeDisabled();
    await expect(page).toHaveURL(/id=ord-ui&returned=1$/);
    refreshRelease();
    await fillCard(page);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('revalidates before SDK confirmation, keeps browser success non-authoritative, then renders server completion', async ({ page }) => {
  const { errors, requests } = await setup(page);
  await page.goto('/checkout/session?id=ord-ui');
  await fillCard(page);
  let resumeCalls = 0;
  await page.route('**/api/orders/ord-ui/resume-payment', async (route) => {
    resumeCalls++;
    expect(await page.evaluate(() => (window as unknown as { __paymentTest: { submits: number } }).__paymentTest.submits)).toBe(1);
    return route.fulfill(json(action));
  });
  await page.getByRole('button', { name: 'Pay by card', exact: true }).click();
  await expect.poll(() => confirms(page)).toBe(1);
  await expect(page.getByRole('heading', { name: 'Pay by card', exact: true })).toBeVisible();
  await expect(page.getByText('Payment confirmed', { exact: true })).toHaveCount(0);
  expect(resumeCalls).toBe(2); // pre-confirm safety plus post-confirm pending revalidation
  const options = await page.evaluate(
    () => (window as unknown as { __paymentTest: { elementOptions: unknown; confirmOptions: unknown } }).__paymentTest,
  );
  expect(options.elementOptions).toMatchObject({ paymentMethodOrder: ['card'], wallets: { applePay: 'never', googlePay: 'never' } });
  expect(options.confirmOptions).toMatchObject({
    redirect: 'if_required',
    returnUrl: new URL('/checkout/session?id=ord-ui&returned=1', page.url()).toString(),
  });
  expect(requests.every((request) => !request.body || !request.body.includes('424242'))).toBe(true);
  expect(requests.some((request) => request.path.endsWith('/paid'))).toBe(false);
  await page.route('**/api/orders/ord-ui/refresh-payment', (route) => route.fulfill(json(response('completed'))));
  await page.goto('/checkout/session?id=ord-ui&returned=1');
  await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View order' })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('field validation remains retryable and duplicate gestures cannot bypass pre-confirm safety', async ({ page }) => {
  const { errors } = await setup(page);
  await page.goto('/checkout/session?id=ord-ui');
  await fillCard(page);
  let resumes = 0;
  await page.route('**/api/orders/ord-ui/resume-payment', (route) => {
    resumes++;
    return route.fulfill(json(action));
  });
  await page.evaluate(() => {
    (window as unknown as { __paymentTest: { mode: string } }).__paymentTest.mode = 'validation-error';
  });
  await page.getByRole('button', { name: 'Pay by card', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Check your card details');
  expect(resumes).toBe(0);
  expect(await confirms(page)).toBe(0);
  await expect(page.getByRole('button', { name: 'Pay by card', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    (window as unknown as { __paymentTest: { mode: string } }).__paymentTest.mode = 'slow-submit';
  });
  await page.getByRole('button', { name: 'Pay by card', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Pay by card', exact: true })).toBeDisabled();
  await page
    .locator('section[aria-labelledby="payment-title"] form')
    .evaluate((form) => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(await page.evaluate(() => (window as unknown as { __paymentTest: { submits: number } }).__paymentTest.submits)).toBe(2);
  expect(resumes).toBe(0);
  await page.evaluate(() => {
    (window as unknown as { __paymentTest: { releaseSubmit: () => void } }).__paymentTest.releaseSubmit();
  });
  await expect.poll(() => confirms(page)).toBe(1);
  expect(errors).toEqual([]);
});

for (const dark of [false, true]) {
  for (const width of [1280, 390]) {
    test(`${width}px ${dark ? 'dark' : 'light'}: card surface follows theme and keyboard navigation`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      const { errors } = await setup(page);
      await page.route('**/api/orders/ord-ui/resume-payment', async (route) => {
        await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark);
        await route.fulfill(json(action));
      });
      await page.goto('/checkout/session?id=ord-ui');
      await fillCard(page);
      const colors = await page.locator('section[aria-labelledby="payment-title"]').evaluate((section) => ({
        background: getComputedStyle(section).backgroundColor,
        foreground: getComputedStyle(section).color,
      }));
      expect(colors.background).not.toBe(colors.foreground);
      const appearance = await page.evaluate(
        () =>
          (window as unknown as { __paymentTest: { options: { appearance: { theme: string; variables: { colorBackground: string } } } } })
            .__paymentTest.options.appearance,
      );
      expect(appearance.theme).toBe(dark ? 'night' : 'stripe');
      expect(appearance.variables.colorBackground).toMatch(/^hsl\(\S/);
      await page.getByTestId('mock-stripe-card').focus();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Pay by card', exact: true })).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath('payment-theme.png'), fullPage: true });
      expect(errors).toEqual([]);
    });
  }
}

test('declined card is retryable after fresh backend safety authorization', async ({ page }) => {
  const { errors } = await setup(page);
  await page.goto('/checkout/session?id=ord-ui');
  await fillCard(page);
  await page.evaluate(() => {
    (window as unknown as { __paymentTest: { mode: string } }).__paymentTest.mode = 'decline';
  });
  await page.getByRole('button', { name: 'Pay by card', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('try another card');
  await expect(page.getByRole('button', { name: 'Pay by card', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    (window as unknown as { __paymentTest: { mode: string } }).__paymentTest.mode = 'success';
  });
  await page.route('**/api/orders/ord-ui/refresh-payment', (route) => route.fulfill(json(response('paid-finalizing'))));
  await page.getByRole('button', { name: 'Pay by card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Payment received — finishing your order' })).toBeVisible();
  expect(await confirms(page)).toBe(2);
  expect(errors).toEqual([]);
});

test('expired inventory denies SDK confirmation without discarding checkout context', async ({ page }) => {
  const { errors } = await setup(page);
  await page.goto('/checkout/session?id=ord-ui');
  await fillCard(page);
  await page.route('**/api/orders/ord-ui/resume-payment', (route) =>
    route.fulfill({ ...json({ data: { code: 'inventory_unavailable' } }), status: 409 }),
  );
  await page.getByRole('button', { name: 'Pay by card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your payment needs review' })).toBeVisible();
  expect(await confirms(page)).toBe(0);
  await expect(page.getByText('Order ord-ui', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const kind of ['processing', 'paid-finalizing', 'recovery-required', 'compensation']) {
  test(`server ${kind} never creates another action or enables payment`, async ({ page }) => {
    const { errors, requests } = await setup(page);
    await page.route('**/api/orders/ord-ui/refresh-payment', (route) =>
      route.fulfill(json({ status: 'success', data: { kind, recoveryRequired: true } })),
    );
    await page.goto('/checkout/session?id=ord-ui&returned=1');
    await expect(page.getByRole('button', { name: 'Check payment status' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay by card', exact: true })).toHaveCount(0);
    expect(requests.some((request) => request.path.endsWith('/resume-payment'))).toBe(false);
    expect(await confirms(page)).toBe(0);
    expect(errors).toEqual([]);
  });
}

test('canceled provider state invokes restart and routes into fresh review, never resumes canceled intent', async ({ page }) => {
  const { errors, requests } = await setup(page);
  await page.route('**/api/orders/ord-ui/refresh-payment', (route) => route.fulfill(json(response('canceled'))));
  await page.route('**/api/orders/ord-ui/restart', (route) =>
    route.fulfill(json({ status: 'success', data: { reviewRequired: true, cartId: 'cart-ui', cartRevision: '2' } })),
  );
  await page.goto('/checkout/session?id=ord-ui&returned=1');
  await page.getByRole('button', { name: 'Review order and try again' }).click();
  await expect(page).toHaveURL(/\/order-summary$/);
  expect(requests.filter((request) => request.path.endsWith('/restart'))).toHaveLength(1);
  expect(requests.some((request) => request.path.endsWith('/resume-payment'))).toBe(false);
  expect(errors).toEqual([]);
});

test('actual default-off route exposes the demo boundary without loading Stripe', async ({ page }) => {
  await page.context().request.get('/api/cart');
  let stripeLoads = 0;
  await page.route('https://js.stripe.com/**', (route) => {
    stripeLoads++;
    return route.abort();
  });
  await page.goto('/checkout/session?id=ord-gate-disabled');
  await expect(page.getByRole('heading', { name: 'Stripe checkout disabled in demo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to order summary', exact: true })).toBeEnabled();
  expect(stripeLoads).toBe(0);
});

test('SDK additional authentication keeps ECAS confirmation disabled until the server refreshes', async ({ page }) => {
  const { errors } = await setup(page);
  await page.goto('/checkout/session?id=ord-ui');
  await fillCard(page);
  await page.evaluate(() => {
    (window as unknown as { __paymentTest: { mode: string } }).__paymentTest.mode = '3ds';
  });
  await page.getByRole('button', { name: 'Pay by card', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Test bank authentication' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Processing payment…' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toHaveCount(0);
  await page.route('**/api/orders/ord-ui/refresh-payment', (route) => route.fulfill(json(response('processing'))));
  await page.getByRole('button', { name: 'Complete test authentication' }).click();
  await expect(page.getByRole('button', { name: 'Check payment status' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('malformed payment action never loads Stripe or enables confirmation', async ({ page }) => {
  const { errors } = await setup(page);
  await page.route('**/api/orders/ord-ui/resume-payment', (route) =>
    route.fulfill(json({ status: 'success', data: { kind: 'requires-action', nextAction: { type: 'future-action' } } })),
  );
  await page.goto('/checkout/session?id=ord-ui');
  await expect(page.getByRole('heading', { name: 'Your payment needs review' })).toBeVisible();
  expect(await confirms(page)).toBe(0);
  await expect(page.getByRole('button', { name: 'Pay by card', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('provider cancellation observed by resume reconciles into explicit restart on normal reload', async ({ page }) => {
  const { errors } = await setup(page);
  await page.route('**/api/orders/ord-ui/resume-payment', (route) =>
    route.fulfill({ ...json({ data: { code: 'payment_recovery_required' } }), status: 409 }),
  );
  await page.route('**/api/orders/ord-ui/refresh-payment', (route) => route.fulfill(json(response('canceled'))));
  await page.goto('/checkout/session?id=ord-ui');
  await expect(page.getByRole('button', { name: 'Review order and try again' })).toBeVisible();
  expect(await confirms(page)).toBe(0);
  expect(errors).toEqual([]);
});
