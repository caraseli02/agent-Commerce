import { expect, test, type Page, type Request } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', size: { width: 390, height: 844 } },
  { name: 'desktop', size: { width: 1440, height: 900 } },
] as const;

type VisualSignals = {
  consoleErrors: string[];
  hydrationWarnings: string[];
  pageErrors: string[];
  requestFailures: string[];
  serverFailures: string[];
};

const installVisualSignals = (page: Page): VisualSignals => {
  const signals: VisualSignals = {
    consoleErrors: [],
    hydrationWarnings: [],
    pageErrors: [],
    requestFailures: [],
    serverFailures: [],
  };

  page.on('console', (message) => {
    const text = message.text();
    if (/hydration|mismatch/i.test(text)) signals.hydrationWarnings.push(`${message.type()}: ${text}`);
    if (message.type() === 'error') signals.consoleErrors.push(text);
  });
  page.on('pageerror', (error) => signals.pageErrors.push(error.message));
  page.on('requestfailed', (request) =>
    signals.requestFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`),
  );
  page.on('response', (response) => {
    if (response.status() >= 500) signals.serverFailures.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });

  return signals;
};

const expectCleanRuntime = (signals: VisualSignals, route: string) => {
  expect(signals.consoleErrors, `console errors while preparing ${route}`).toEqual([]);
  expect(signals.hydrationWarnings, `hydration warnings while preparing ${route}`).toEqual([]);
  expect(signals.pageErrors, `page errors while preparing ${route}`).toEqual([]);
  expect(signals.requestFailures, `failed requests while preparing ${route}`).toEqual([]);
  expect(signals.serverFailures, `5xx responses while preparing ${route}`).toEqual([]);
};

const waitForVisualReady = async (page: Page, route: string) => {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#__nuxt')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[aria-busy="true"]'), `loading state remained visible on ${route}`).toHaveCount(0);
};

// Playwright's `networkidle` load state only follows document loads, so it is already
// satisfied after a client-side route change. Track requests directly for those.
const trackNetworkActivity = (page: Page) => {
  const inFlight = new Set<Request>();
  let lastActivityAt = Date.now();
  const start = (request: Request) => {
    inFlight.add(request);
    lastActivityAt = Date.now();
  };
  const settle = (request: Request) => {
    inFlight.delete(request);
    lastActivityAt = Date.now();
  };
  page.on('request', start);
  page.on('requestfinished', settle);
  page.on('requestfailed', settle);

  const waitForQuiet = async (route: string, quietMs = 500) => {
    try {
      await expect
        .poll(() => inFlight.size === 0 && Date.now() - lastActivityAt >= quietMs, {
          message: `network never settled on ${route}`,
          intervals: [100],
        })
        .toBe(true);
    } finally {
      page.off('request', start);
      page.off('requestfinished', settle);
      page.off('requestfailed', settle);
    }
  };

  return { waitForQuiet };
};

const visit = async (page: Page, route: string) => {
  const signals = installVisualSignals(page);
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await waitForVisualReady(page, route);
  return signals;
};

const clearGuestCart = async (page: Page) => {
  await page.request.delete('/api/cart', {
    data: { products: ['prod-1', 'prod-2'] },
  });
  await page.evaluate(() => localStorage.removeItem('cart-store'));
};

const preparePopulatedCart = async (page: Page) => {
  const productSignals = await visit(page, '/product/prod-2');
  await expect(page.getByText('ADM2587E RS-485 Transceiver', { exact: true }).first()).toBeVisible();
  await clearGuestCart(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForVisualReady(page, '/product/prod-2');

  const purchasePanel = page.getByTestId('product-purchase-panel');
  const addToCart = purchasePanel.getByRole('button', { name: /add to cart/i });
  await addToCart.scrollIntoViewIfNeeded();
  await expect(addToCart).toBeEnabled();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'POST'),
    addToCart.click(),
  ]);
  expectCleanRuntime(productSignals, '/product/prod-2');

  await page.getByRole('button', { name: 'Open shopping cart' }).click();
  const cartSheet = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /shopping cart/i }) });
  await expect(cartSheet).toBeVisible();
  await expect(cartSheet.getByText('ADM2587E RS-485 Transceiver', { exact: true })).toBeVisible();

  return { cartSheet, signals: productSignals };
};

const signInAsCustomer = async (page: Page) => {
  const signals = await visit(page, '/?signin=true');
  await page.getByRole('radio', { name: 'Customer Demo' }).click();
  await expect(page.getByLabel('E-mail or client code')).toHaveValue('customer@demo.com');
  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  const network = trackNetworkActivity(page);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
  await expect(page).toHaveURL(/\/dashboard\/client\?tab=home/);
  // Let the post-login dashboard finish loading; navigating away mid-load aborts its
  // chunk and API requests, which the signal listeners would report as failures.
  // Sign-in reaches the dashboard through a client-side navigation, and once its data
  // renders, NuxtLink prefetches the linked order pages' chunks, so wait for the
  // network to go quiet as well.
  await waitForVisualReady(page, '/dashboard/client?tab=home');
  await network.waitForQuiet('/dashboard/client?tab=home');
  return signals;
};

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const disableMotion = () => {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          scroll-behavior: auto !important;
        }
      `;
      document.head.append(style);
    };

    if (document.head) disableMotion();
    else document.addEventListener('DOMContentLoaded', disableMotion, { once: true });
  });
});

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} storefront recovery matrix`, () => {
    test.use({ viewport: viewport.size });

    test('homepage preserves header and merchandising', async ({ page }) => {
      const signals = await visit(page, '/');
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

      await expect(page).toHaveScreenshot(`home-${viewport.name}.png`);
      await expect(page.getByRole('banner')).toHaveScreenshot(`home-header-${viewport.name}.png`);
      expectCleanRuntime(signals, '/');
    });

    test('populated search preserves its result card', async ({ page }) => {
      const signals = await visit(page, '/search?keyword=STM32');
      const productLink = page.getByRole('link', { name: 'STM32F407VGT6 Microcontroller', exact: true }).first();
      await expect(productLink).toBeVisible();
      const productCard = productLink.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');

      await expect(page).toHaveScreenshot(`search-stm32-${viewport.name}.png`);
      await expect(productCard).toHaveScreenshot(`search-result-card-${viewport.name}.png`);
      expectCleanRuntime(signals, '/search?keyword=STM32');
    });

    test('product detail preserves its purchase controls', async ({ page }) => {
      const signals = await visit(page, '/product/prod-1');
      await expect(page.getByRole('heading', { level: 1, name: 'STM32F407VGT6 Microcontroller' })).toBeVisible();
      const purchasePanel = page.getByTestId('product-purchase-panel');
      await expect(purchasePanel).toBeVisible();

      await expect(page).toHaveScreenshot(`product-detail-${viewport.name}.png`);
      await expect(purchasePanel).toHaveScreenshot(`product-purchase-panel-${viewport.name}.png`);
      expectCleanRuntime(signals, '/product/prod-1');
    });

    test('populated cart preserves checkout entry', async ({ page }) => {
      const { cartSheet, signals } = await preparePopulatedCart(page);

      await expect(page).toHaveScreenshot(`populated-cart-${viewport.name}.png`);
      await expect(cartSheet).toHaveScreenshot(`populated-cart-sheet-${viewport.name}.png`);
      expectCleanRuntime(signals, '/product/prod-2');
    });
  });
}

test.describe('mobile customer orders recovery surface', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('customer order history remains readable and scrollable', async ({ page }) => {
    const signInSignals = await signInAsCustomer(page);
    const orderSignals = await visit(page, '/dashboard/client?tab=orders');
    const orderTable = page.getByRole('region', { name: 'Data table' });
    await expect(page.getByRole('heading', { name: 'Orders List' })).toBeVisible();
    await expect(orderTable).toBeVisible();
    await expect(page.getByText(/scroll to view more order details/i)).toBeVisible();
    await orderTable.scrollIntoViewIfNeeded();

    await expect(page).toHaveScreenshot('customer-orders-mobile.png');
    await expect(orderTable).toHaveScreenshot('customer-orders-table-mobile.png');
    expectCleanRuntime(signInSignals, '/?signin=true');
    expectCleanRuntime(orderSignals, '/dashboard/client?tab=orders');
  });
});
