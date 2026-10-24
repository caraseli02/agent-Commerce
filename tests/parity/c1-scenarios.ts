import { expect, type Page } from '@playwright/test';
import { clearGuestCart, waitForVisualReady } from '../playwright-support/runtime';
import type { ParityScenario } from './scenario';

const card = (page: Page, text: string) =>
  page.getByText(text, { exact: true }).locator('xpath=ancestor::div[contains(@class, "shadow-xs")][1]');
const actions = (page: Page) =>
  page.getByRole('link', { name: 'Continue Shopping' }).locator('xpath=ancestor::div[contains(@class, "mb-8")][1]');
const guestAddresses = (page: Page) => page.getByTestId('guest-contact-form').locator('xpath=..');
const table = (page: Page) => page.getByText('Select All', { exact: true }).locator('xpath=ancestor::div[contains(@class, "mb-6")][1]');

/** Use real mock endpoints and an isolated test schema; no payment authority is stubbed. */
const checkout = async (page: Page, productId = 'prod-2') => {
  await clearGuestCart(page);
  const token = (await page.context().cookies()).find((cookie) => cookie.name === 'token')?.value;
  const headers = token ? { authorization: `Bearer ${decodeURIComponent(token)}` } : undefined;
  if (headers) await page.request.delete('/api/cart', { headers, data: { products: ['prod-1', 'prod-2'] } });
  const response = await page.request.post('/api/cart', {
    headers,
    data: { products: [{ id: productId, stock: 1, backorder_stock: 0, isFolder: false }] },
  });
  expect(response.ok()).toBe(true);
  await page.goto('/order-summary', { waitUntil: 'domcontentloaded' });
  await waitForVisualReady(page, '/order-summary');
  await expect(table(page).getByRole('checkbox')).toHaveCount(2);
  await expect(card(page, 'Payment Summary').getByText('(VAT 19%)', { exact: true })).toBeVisible();
  await expect(card(page, 'Payment Summary').locator('.animate-pulse')).toHaveCount(0);
};

const guestCheckout = async (page: Page, productId = 'prod-2') => {
  await checkout(page, productId);
  await page.getByTestId('checkout-as-guest').click();
  await expect(guestAddresses(page)).toBeVisible();
};

export const c1Scenarios: ParityScenario[] = [
  {
    id: 'C1-header',
    slice: 'C1',
    route: '/',
    viewports: ['desktop', 'mobile'],
    setup: checkout,
    region: (page) => page.getByRole('heading', { name: 'Order Summary', exact: true }).locator('xpath=..'),
    steps: [
      {
        name: 'print invokes the browser print action once',
        act: async (page, region) => {
          await page.evaluate(() => {
            window.print = () => {
              document.documentElement.dataset.parityPrint = String(Number(document.documentElement.dataset.parityPrint || 0) + 1);
            };
          });
          await region.locator('button').last().focus();
          await page.keyboard.press('Enter');
        },
        verify: async (page) => {
          await expect(page.locator('html')).toHaveAttribute('data-parity-print', '1');
        },
      },
    ],
  },
  {
    id: 'C1-checkout-entry',
    slice: 'C1',
    route: '/',
    viewports: ['desktop', 'mobile'],
    setup: checkout,
    region: actions,
    steps: [
      {
        name: 'links keep their destinations and guest checkout opens the form',
        act: async (page, region) => {
          await expect(region.getByRole('link', { name: 'Continue Shopping' })).toHaveAttribute('href', '/search');
          await expect(region.getByRole('link', { name: 'Sign in to Continue Checkout' })).toHaveAttribute(
            'href',
            '/?signin=true&redirect=%2Forder-summary',
          );
          await region.getByTestId('checkout-as-guest').focus();
          await page.keyboard.press('Enter');
        },
        verify: async (page) => {
          await expect(guestAddresses(page)).toBeVisible();
          await expect(page.getByRole('button', { name: 'Secure Checkout', exact: true })).toBeDisabled();
          await expect(page.getByTestId('payment-management')).toHaveCount(0);
        },
        snapshot: actions,
      },
    ],
  },
  {
    id: 'C1-guest-addresses',
    slice: 'C1',
    route: '/',
    viewports: ['desktop', 'mobile'],
    setup: guestCheckout,
    region: guestAddresses,
    steps: [
      {
        name: 'contact and shipping labels focus their inputs',
        act: async (_page, region) => {
          for (const name of [
            'First name',
            'Last name',
            'Email',
            'Phone',
            'Address line 1',
            'Address line 2 (optional)',
            'City',
            'Region / State',
            'Postcode',
            'Country',
          ]) {
            await region
              .locator('label')
              .filter({ hasText: name })
              .filter({ hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
              .click();
            await expect(region.getByRole('textbox', { name, exact: true })).toBeFocused();
          }
          await region.getByLabel('First name', { exact: true }).fill('Jane');
          await region.getByLabel('Address line 1', { exact: true }).fill('123 Market Street');
        },
        verify: async (_page, region) => {
          await expect(region.getByLabel('First name', { exact: true })).toHaveValue('Jane');
          await expect(region.getByLabel('Address line 1', { exact: true })).toHaveValue('123 Market Street');
        },
      },
      {
        name: 'keyboard toggles separate billing fields',
        act: async (page, region) => {
          await region.getByRole('checkbox').focus();
          await page.keyboard.press('Space');
        },
        verify: async (page, region) => {
          await expect(region.getByRole('checkbox')).not.toBeChecked();
          await expect(page.getByTestId('guest-billing-form').getByLabel('Address line 1', { exact: true })).toBeVisible();
          await page.getByTestId('guest-billing-form').getByLabel('Address line 1', { exact: true }).fill('456 Billing Road');
        },
        snapshot: guestAddresses,
      },
      {
        name: 'billing can match shipping again',
        act: async (page, region) => {
          await region.getByRole('checkbox').focus();
          await page.keyboard.press('Space');
        },
        verify: async (page, region) => {
          await expect(region.getByRole('checkbox')).toBeChecked();
          await expect(page.getByTestId('guest-billing-form').getByText('Billing address will match your shipping address.')).toBeVisible();
        },
      },
    ],
  },
  {
    id: 'C1-note',
    slice: 'C1',
    route: '/',
    viewports: ['desktop', 'mobile'],
    setup: checkout,
    region: (page) => card(page, 'Add a note for this order'),
    steps: [
      {
        name: 'keyboard opens the note and multiline input keeps rows and length',
        act: async (page, region) => {
          await region.getByRole('button').focus();
          await page.keyboard.press('Enter');
          await region.getByRole('textbox').fill('Deliver to reception\nUse the side entrance\nCall on arrival');
          await region.getByRole('textbox').press('Tab');
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('textbox')).toHaveAttribute('maxlength', '170');
          await expect(region.getByRole('textbox')).toHaveAttribute('rows', '3');
          await expect(region.getByRole('textbox')).toHaveValue('Deliver to reception\nUse the side entrance\nCall on arrival');
        },
        snapshot: (page) => card(page, 'Add a note for this order'),
      },
      {
        name: 'closing and reopening retains the note',
        act: async (_page, region) => {
          await region.getByRole('button').click();
          await region.getByRole('button').click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('textbox')).toHaveValue('Deliver to reception\nUse the side entrance\nCall on arrival');
        },
      },
    ],
  },
  {
    id: 'C1-payment-summary',
    slice: 'C1',
    route: '/',
    viewports: ['desktop', 'mobile'],
    setup: (page) => guestCheckout(page, 'prod-11'),
    region: (page) => card(page, 'Payment Summary'),
    steps: [
      {
        name: 'handling charge help opens by keyboard',
        act: async (page, region) => {
          await region.getByRole('button', { name: 'Explain small order handling charge' }).focus();
          await page.keyboard.press('Enter');
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog', { name: 'Small Order Handling Charge' })).toBeVisible();
        },
        snapshot: (page) => page.getByRole('dialog', { name: 'Small Order Handling Charge' }),
      },
    ],
  },
  {
    id: 'C1-table',
    slice: 'C1',
    route: '/',
    viewports: ['desktop', 'mobile'],
    setup: async (page) => {
      await checkout(page);
      if (page.viewportSize()!.width < 1280) await table(page).getByText('ADM2587E RS-485 Transceiver', { exact: true }).click();
      await expect(table(page).getByRole('button', { name: 'Packaging', exact: true })).toBeVisible();
    },
    region: table,
    steps: [
      {
        name: 'packaging opens its details',
        act: async (page, region) => {
          await region.getByRole('button', { name: 'Packaging', exact: true }).focus();
          await page.keyboard.press('Enter');
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('heading', { name: 'Packaging Details' })).toBeVisible();
        },
        snapshot: table,
      },
      {
        name: 'delivery opens its details',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Delivery', exact: true }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('heading', { name: 'Delivery Details' })).toBeVisible();
        },
        snapshot: table,
      },
      {
        name: 'select all enables bulk delete and cancellation preserves the item',
        act: async (_page, region) => {
          await region.getByRole('checkbox').first().click();
          await region.getByRole('button', { name: 'Delete Selected' }).click();
        },
        verify: async (page, region) => {
          const dialog = page.getByRole('dialog');
          await expect(dialog.getByRole('heading', { name: 'Delete Item', exact: true })).toBeVisible();
          await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
          await expect(region.getByText('ADM2587E RS-485 Transceiver', { exact: true })).toBeVisible();
        },
        snapshot: table,
      },
      {
        name: 'keyboard item selection stays synchronized with select all',
        act: async (page, region) => {
          const item = region.getByRole('checkbox', { name: 'Select ADM2587E RS-485 Transceiver', exact: true });
          const all = region.getByRole('checkbox', { name: 'Select All', exact: true });
          await expect(item).toBeChecked();
          await item.focus();
          await page.keyboard.press('Space');
          await expect(item).not.toBeChecked();
          await expect(all).not.toBeChecked();
          await expect(region.getByRole('button', { name: 'Delete Selected' })).toBeDisabled();
          await page.keyboard.press('Space');
          await expect(item).toBeChecked();
          await expect(all).toBeChecked();
          await all.click();
          await expect(item).not.toBeChecked();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: 'Delete Selected' })).toBeDisabled();
        },
      },
      {
        name: 'single item delete opens by keyboard and cancellation preserves the cart',
        act: async (page, region) => {
          const remove =
            page.viewportSize()!.width >= 1280
              ? region.getByRole('button', { name: 'Delete item', exact: true })
              : region.getByRole('button', { name: 'Delete', exact: true });
          await remove.focus();
          await page.keyboard.press('Enter');
          const dialog = page.getByRole('dialog');
          await expect(dialog.getByRole('heading', { name: 'Delete Item', exact: true })).toBeVisible();
          await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByText('ADM2587E RS-485 Transceiver', { exact: true })).toBeVisible();
          await expect(region.getByRole('checkbox', { name: 'Select ADM2587E RS-485 Transceiver', exact: true })).not.toBeChecked();
        },
      },
    ],
  },
  {
    id: 'C1-saved-addresses',
    slice: 'C1',
    route: '/',
    viewports: ['desktop', 'mobile'],
    role: 'customer',
    setup: async (page) => {
      await checkout(page);
      const addresses = page.getByRole('button', { name: 'Shipping and Billing', exact: true });
      if (!(await page.getByText('Billing Information', { exact: true }).isVisible())) await addresses.click();
    },
    region: (page) => page.getByText('Billing Information', { exact: true }).locator('xpath=ancestor::div[contains(@class, "mt-6")][1]'),
    steps: [
      {
        name: 'edit icon keeps its account settings destination',
        act: async (_page, region) => {
          await region.locator('button svg').first().click();
        },
        verify: async (page) => {
          await expect(page).toHaveURL(/\/dashboard\/client\?tab=settings/);
          await waitForVisualReady(page, '/dashboard/client?tab=settings');
        },
      },
    ],
  },
];
