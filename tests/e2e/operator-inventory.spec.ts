import { expect, test, type Page } from '@playwright/test';

const ME_ROUTE = '**/api/operator/me';
const INVENTORY_ROUTE = '**/api/operator/inventory';
const USER_DETAILS_ROUTE = '**/api/user/cus_*/details';

const makeCustomerAccountToken = (accountId = 'cus_0123456789abcdef0123456789abcdef') => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      typ: 'customer-account',
      sub: accountId,
      user_id: accountId,
      role: 'customer',
      email: 'operator@example.com',
      given_name: 'Ana',
      family_name: 'Pop',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
};

const installCustomerAccountSession = async (page: Page, accountId = 'cus_0123456789abcdef0123456789abcdef') => {
  await page.route(USER_DETAILS_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          _id: accountId,
          firebaseId: accountId,
          role: 0,
          accountType: 0,
          contactDetails: { firstName: 'Ana', lastName: 'Pop', email: 'operator@example.com', phone: '' },
        },
      }),
    });
  });

  await page.context().addCookies([
    {
      name: 'token',
      value: makeCustomerAccountToken(accountId),
      domain: 'localhost',
      path: '/',
    },
  ]);
};

const sampleInventoryRows = [
  {
    productId: 'prod-1',
    sku: 'MCU-001',
    name: 'STM32F407VGT6 Microcontroller',
    state: 'tracked' as const,
    onHand: 10,
    effectiveHeld: 3,
    available: 7,
  },
  {
    productId: 'prod-2',
    sku: 'CAP-002',
    name: '100uF Electrolytic Capacitor',
    state: 'untracked' as const,
  },
];

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test.describe(`Operator inventory view (${viewport.name})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('renders loading state, tracked and untracked stock rows, and operator navigation', async ({ page }) => {
      await installCustomerAccountSession(page);

      await page.route(ME_ROUTE, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: { accountId: 'cus_0123456789abcdef0123456789abcdef', permissions: ['inventory:read'] },
          }),
        });
      });

      let releaseInventory!: () => void;
      const inventoryGate = new Promise<void>((resolve) => {
        releaseInventory = resolve;
      });

      await page.route(INVENTORY_ROUTE, async (route) => {
        await inventoryGate;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', data: sampleInventoryRows }),
        });
      });

      await page.goto('/dashboard/operator/inventory');
      await expect(page.getByTestId('operator-inventory-loading')).toBeVisible();

      releaseInventory();

      await expect(page.getByTestId('operator-inventory-table')).toBeVisible();
      await expect(page.getByTestId('operator-inventory-row-prod-1')).toContainText('MCU-001');
      await expect(page.getByTestId('operator-inventory-row-prod-1')).toContainText('STM32F407VGT6 Microcontroller');
      await expect(page.getByTestId('operator-inventory-on-hand-prod-1')).toHaveText('10');
      await expect(page.getByTestId('operator-inventory-held-prod-1')).toHaveText('3');
      await expect(page.getByTestId('operator-inventory-available-prod-1')).toHaveText('7');

      await expect(page.getByTestId('operator-inventory-on-hand-prod-2')).toHaveText('Untracked');
      await expect(page.getByTestId('operator-inventory-held-prod-2')).toHaveText('—');
      await expect(page.getByTestId('operator-inventory-available-prod-2')).toHaveText('Untracked');

      if (viewport.name === 'mobile') {
        await page.getByRole('button', { name: 'Open navigation' }).click();
      }
      await expect(
        page.getByRole('navigation', { name: 'Dashboard' }).getByRole('link', { name: 'Inventory' }).filter({ visible: true }),
      ).toHaveAttribute('href', '/dashboard/operator/inventory');
    });

    test('shows an error alert when the stock read fails and recovers on retry', async ({ page }) => {
      await installCustomerAccountSession(page);

      await page.route(ME_ROUTE, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: { accountId: 'cus_0123456789abcdef0123456789abcdef', permissions: ['inventory:read'] },
          }),
        });
      });

      let shouldFail = true;
      await page.route(INVENTORY_ROUTE, async (route) => {
        if (shouldFail) {
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ statusMessage: 'Stock levels are temporarily unavailable.' }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'success', data: sampleInventoryRows }),
        });
      });

      await page.goto('/dashboard/operator/inventory');
      await expect(page.getByTestId('operator-inventory-error')).toContainText('Stock levels could not be loaded.');
      await expect(page.getByTestId('operator-inventory-table')).toHaveCount(0);

      shouldFail = false;
      await page.getByTestId('operator-inventory-retry').click();
      await expect(page.getByTestId('operator-inventory-table')).toBeVisible();
      await expect(page.getByTestId('operator-inventory-available-prod-1')).toHaveText('7');
    });

    test('denies anonymous users, non-operator customers, and demo credentials and hides operator navigation', async ({ page }) => {
      const unauthApi = await page.request.get('/api/operator/inventory');
      expect(unauthApi.status()).toBe(401);

      const forgedDemoApi = await page.request.get('/api/operator/inventory', {
        headers: { authorization: `Bearer demo-token::mock-admin-1::${Date.now()}` },
      });
      expect(forgedDemoApi.status()).toBe(401);

      await page.goto('/dashboard/operator/inventory');
      await expect(page).toHaveURL(/\/\?signin=true&redirect=(?:%2F|\/)dashboard(?:%2F|\/)operator(?:%2F|\/)inventory$/);

      // Non-operator registered customer: /api/operator/me and /api/operator/inventory return 403.
      await installCustomerAccountSession(page, 'cus_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      await page.route(ME_ROUTE, async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ statusMessage: 'Forbidden' }),
        });
      });
      await page.route(INVENTORY_ROUTE, async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ statusMessage: 'Forbidden' }),
        });
      });

      await page.goto('/dashboard/operator/inventory');
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator('a[href="/dashboard/operator/inventory"]')).toHaveCount(0);

      // Demo admin: rejected from operator page and never shown operator navigation on dashboard.
      await page.context().addCookies([
        {
          name: 'token',
          value: `demo-token::mock-admin-1::${Date.now()}`,
          domain: 'localhost',
          path: '/',
        },
      ]);
      await page.goto('/dashboard/operator/inventory');
      await expect(page).toHaveURL(/\/$/);

      await page.goto('/dashboard');
      if (viewport.name === 'mobile') {
        await page.getByRole('button', { name: 'Open navigation' }).click();
      }
      await expect(page.locator('a[href="/dashboard/operator/inventory"]')).toHaveCount(0);
    });
  });
}
