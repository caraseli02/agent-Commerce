import { expect } from '@playwright/test';
import { clearGuestCart } from '../playwright-support/runtime';
import type { ParityScenario } from './scenario';

/**
 * Parity scenarios, one or more per migration slice (see #631). A slice adds
 * its scenarios and records snapshots on unchanged code before migrating.
 * Keep regions tight around the migrated controls and steps free of copy that
 * the migration is not allowed to change.
 */
export const scenarios: ParityScenario[] = [
  {
    id: 'forgot-password-form',
    slice: 'M1',
    route: '/forgot-password',
    viewports: ['desktop'],
    region: (page) => page.locator('form').filter({ has: page.getByLabel('Email Address') }),
  },
  {
    id: 'search-result-card',
    slice: 'M2',
    route: '/search?keyword=STM32',
    viewports: ['desktop'],
    setup: async (page) => {
      await clearGuestCart(page);
      await page.reload({ waitUntil: 'networkidle' });
    },
    region: (page) =>
      page
        .getByRole('link', { name: 'STM32F407VGT6 Microcontroller', exact: true })
        .first()
        .locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]'),
    steps: [
      {
        name: 'add to cart updates the header cart',
        act: async (page, region) => {
          await Promise.all([
            page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'POST'),
            region.getByRole('button', { name: /add to cart/i }).click(),
          ]);
        },
        verify: async (page) => {
          await expect(page.getByRole('button', { name: 'Open shopping cart' })).toContainText('1');
        },
      },
    ],
  },
  {
    id: 'product-purchase-panel',
    slice: 'M3',
    route: '/product/prod-1',
    viewports: ['desktop', 'mobile'],
    region: (page) => page.getByTestId('product-purchase-panel'),
    steps: [
      {
        name: 'increase quantity',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Increase quantity' }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('2');
        },
      },
    ],
  },
  {
    id: 'storefront-header',
    slice: 'M4',
    route: '/',
    viewports: ['desktop'],
    region: (page) => page.locator('header').first(),
    steps: [
      {
        name: 'open account panel',
        act: async (page) => {
          await page.getByRole('button', { name: 'Open my account' }).click();
        },
        verify: async (page) => {
          await expect(page.getByRole('radio', { name: 'Customer Demo' })).toBeVisible();
        },
        snapshot: (page) => page.getByRole('dialog'),
      },
    ],
  },
  {
    id: 'storefront-mobile-menu',
    slice: 'M4',
    route: '/',
    viewports: ['mobile'],
    region: (page) => page.locator('header').first(),
    steps: [
      {
        name: 'open products navigation',
        act: async (page) => {
          await page.getByRole('button', { name: 'Open products navigation' }).first().click();
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog')).toBeVisible();
        },
        snapshot: (page) => page.getByRole('dialog'),
      },
    ],
  },
  {
    id: 'dashboard-header',
    slice: 'M5',
    route: '/dashboard',
    role: 'admin',
    viewports: ['desktop'],
    region: (page) => page.locator('header').first(),
    steps: [
      {
        name: 'open profile menu',
        act: async (page, region) => {
          await region.getByRole('button', { name: /Demo Admin/ }).click();
        },
        verify: async (page, region) => {
          await expect(region.getByRole('button', { name: 'Sign out' })).toBeVisible();
        },
        snapshot: (page) => page.locator('header').first(),
      },
    ],
  },
  {
    id: 'control-panel-account-details',
    slice: 'M6',
    route: '/dashboard/customers/customer-001/control-panel/account',
    role: 'admin',
    viewports: ['desktop'],
    region: (page) =>
      page.getByRole('heading', { name: 'Account Details' }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
    maxTabStops: 30,
    steps: [
      {
        name: 'enter edit mode',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Edit' }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: 'Save' })).toBeVisible();
          await expect(region.getByRole('button', { name: 'Cancel' })).toBeVisible();
        },
        snapshot: (page) =>
          page.getByRole('heading', { name: 'Account Details' }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
      },
    ],
  },
];
