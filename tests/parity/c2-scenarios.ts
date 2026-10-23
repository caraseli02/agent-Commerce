import { expect, type Page } from '@playwright/test';
import { clearGuestCart, waitForVisualReady } from '../playwright-support/runtime';
import type { ParityScenario } from './scenario';

const controls = (page: Page) =>
  page.getByRole('button', { name: 'Shipping and Billing', exact: true }).locator('xpath=ancestor::div[contains(@class, "shadow-xs")][1]');

const checkout = async (page: Page) => {
  await clearGuestCart(page);
  const token = (await page.context().cookies()).find((cookie) => cookie.name === 'token')?.value;
  const headers = token ? { authorization: `Bearer ${decodeURIComponent(token)}` } : undefined;
  if (headers) await page.request.delete('/api/cart', { headers, data: { products: ['prod-1', 'prod-2'] } });
  const response = await page.request.post('/api/cart', {
    headers,
    data: { products: [{ id: 'prod-2', stock: 1, backorder_stock: 1, isFolder: false }] },
  });
  expect(response.ok()).toBe(true);
  await page.goto('/order-summary', { waitUntil: 'domcontentloaded' });
  await waitForVisualReady(page, '/order-summary');
  const guest = page.getByTestId('checkout-as-guest');
  if (await guest.isVisible()) await guest.click();
  await expect(controls(page).getByText('Select Payment', { exact: true })).toBeVisible();
};

export const c2Scenarios: ParityScenario[] = [
  {
    id: 'C2-guest-checkout-controls',
    slice: 'C2',
    route: '/',
    viewports: ['desktop', 'mobile'],
    setup: checkout,
    region: controls,
    steps: [
      {
        name: 'valid shipping preferences collapse and reopen by keyboard',
        act: async (page, region) => {
          const trigger = region.getByRole('button', { name: 'Shipping Preferences', exact: true });
          await trigger.focus();
          await page.keyboard.press('Enter');
          await expect(region.getByText('Delivery Method', { exact: true })).toBeHidden();
          await page.keyboard.press('Enter');
        },
        verify: async (_page, region) => {
          await expect(region.getByText('Delivery Method', { exact: true })).toBeVisible();
          const backorder = region.getByRole('button', { name: /Backorder Standard/ });
          await backorder.click();
          await expect(backorder).toHaveAttribute('aria-pressed', 'true');
          await region.getByRole('button', { name: /Fast Lane Next Day/ }).click();
        },
        snapshot: controls,
      },
      {
        name: 'keyboard chooses cash and a valid payment section can collapse',
        act: async (page, region) => {
          await region.getByRole('button', { name: 'Cash on delivery', exact: true }).focus();
          await page.keyboard.press('Enter');
          await region.getByRole('button', { name: 'Payment Method', exact: true }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByText('Select Payment', { exact: true })).toBeHidden();
          await region.getByRole('button', { name: 'Payment Method', exact: true }).click();
          await expect(region.getByText('Cash on delivery', { exact: true })).toBeVisible();
        },
        snapshot: controls,
      },
    ],
  },
  {
    id: 'C2-customer-checkout-controls',
    slice: 'C2',
    route: '/',
    role: 'customer',
    viewports: ['desktop', 'mobile'],
    setup: checkout,
    region: controls,
  },
  {
    id: 'C2-missing-saved-card',
    slice: 'C2',
    route: '/',
    role: 'customer',
    viewports: ['desktop', 'mobile'],
    setup: async (page) => {
      await page.evaluate(() =>
        sessionStorage.setItem('checkout-draft-v1', JSON.stringify({ paymentDetails: { type: 0, cardId: 'removed-card' } })),
      );
      await checkout(page);
    },
    region: controls,
    steps: [
      {
        name: 'invalid payment cannot collapse until another method is chosen',
        act: async (page, region) => {
          await expect(region.getByRole('alert')).toContainText('Your saved card is no longer available');
          await region.getByRole('button', { name: 'Payment Method', exact: true }).focus();
          await page.keyboard.press('Enter');
        },
        verify: async (_page, region) => {
          await expect(region.getByText('Select Payment', { exact: true })).toBeVisible();
          await region.getByRole('button', { name: 'Bank Transfer', exact: true }).click();
          await expect(region.getByRole('alert')).toHaveCount(0);
        },
        snapshot: controls,
      },
    ],
  },
  {
    id: 'C2-settings-saved-cards',
    slice: 'C2',
    route: '/dashboard/client?tab=settings',
    role: 'customer',
    viewports: ['desktop', 'mobile'],
    region: (page) => page.locator('#payments'),
    steps: [
      {
        name: 'saved card remains keyboard selectable',
        act: async (page, region) => {
          await region.getByRole('button').filter({ hasText: '4242' }).first().focus();
          await page.keyboard.press('Enter');
        },
        verify: async (_page, region) => {
          await expect(region.getByText('4242', { exact: true })).toBeVisible();
          await expect(region.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();
          await expect(region.locator('button button')).toHaveCount(0);
        },
        snapshot: (page) => page.locator('#payments'),
      },
    ],
  },
];
