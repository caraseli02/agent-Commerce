import { expect, type Locator, type Page, type Request } from '@playwright/test';
import { clearGuestCart } from '../playwright-support/runtime';
import type { ParityScenario, ParityViewport } from './scenario';

const filterValue = (name: string, value: string, unit: string, id: string, count: number) => ({
  FeatureName: name,
  FeatureValue: value,
  FeatureUnit: unit,
  FeatureID: id,
  FeatureValueDetails: { Value: value, Multiplier: '', MultiplierValue: '', Unit: unit, Sign: '' },
  count,
});

/** The mock search API returns no filters, so M2 scenarios inject this fixed set into client-side search responses. */
const searchFiltersFixture = {
  'Supply Voltage': [
    filterValue('Supply Voltage', '1.8', 'V', 'supply-voltage', 4),
    filterValue('Supply Voltage', '3.3', 'V', 'supply-voltage', 7),
  ],
  Package: [filterValue('Package', 'LQFP-100', '', 'package', 3), filterValue('Package', 'QFN-48', '', 'package', 2)],
  Core: [filterValue('Core', 'ARM Cortex-M4', '', 'core', 5)],
};

type NuxtRoot = { __vue_app__: { config: { globalProperties: { $router: { push: (to: string) => Promise<unknown> } } } } };

/** Serves search responses with the filter fixture, then runs a client-side search so the filter UI renders. */
const showSearchWithFilters = async (page: Page, viewport: ParityViewport) => {
  await page.route('**/api/products/search**', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.data.filters = structuredClone(searchFiltersFixture);
    await route.fulfill({ response, json });
  });
  await page.evaluate(async () => {
    const root = document.querySelector('#__nuxt') as unknown as NuxtRoot;
    await root.__vue_app__.config.globalProperties.$router.push('/search?keyword=STM32F4');
  });
  const ready =
    viewport === 'desktop'
      ? page.getByText('Add/Remove Filter', { exact: true })
      : page.getByRole('button', { name: 'Filters', exact: true });
  await expect(ready).toBeVisible();
};

/** Waits for a search request whose query string or body matches `pattern`. */
const waitForSearchWith = (page: Page, pattern: string | RegExp) =>
  page.waitForRequest((request) => {
    if (!request.url().includes('/api/products/search')) return false;
    const sent = `${decodeURIComponent(request.url())} ${request.postData() ?? ''}`;
    return typeof pattern === 'string' ? sent.includes(pattern) : pattern.test(sent);
  });

/** Set by a step's `act`, awaited by its `verify`. */
let pendingSearch: Promise<Request> | undefined;

/** The results header row: "Products Found (n)" and the pager with its previous/next icon buttons. */
const resultsPagerRow = (page: Page) =>
  page.getByText(/^Products Found \(/).locator('xpath=parent::div[contains(@class, "md:justify-between")]');

const filtersHeaderRow = (region: Locator) =>
  region.getByText('Reset Filters', { exact: true }).locator('xpath=ancestor::div[contains(@class, "justify-between")][1]');

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
    viewports: ['desktop', 'mobile'],
    region: (page) => page.locator('form').filter({ has: page.getByLabel('Email Address') }),
  },
  {
    id: 'password-reset-form',
    slice: 'M1',
    route: '/password-reset',
    viewports: ['desktop', 'mobile'],
    region: (page) => page.locator('form').filter({ has: page.getByLabel('New Password') }),
    steps: [
      {
        name: 'mismatched passwords show an error',
        act: async (_page, region) => {
          await region.getByLabel('New Password').fill('first-password');
          await region.getByLabel('Repeat Password').fill('second-password');
          await region.getByRole('button', { name: 'Save Password' }).click();
        },
        verify: async (page, region) => {
          await expect(region.getByText('Passwords do not match')).toBeVisible();
          await expect(page).toHaveURL(/\/password-reset$/);
        },
      },
    ],
  },
  {
    id: 'verify-email-action',
    slice: 'M1',
    route: '/verify-email',
    viewports: ['desktop', 'mobile'],
    region: (page) => page.getByRole('heading', { name: 'Verify your email' }).locator('xpath=..'),
    steps: [
      {
        name: 'verify without a code stays on the page',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Verify' }).click();
        },
        verify: async (page) => {
          await expect(page).toHaveURL(/\/verify-email$/);
        },
      },
    ],
  },
  {
    id: 'search-result-card',
    slice: 'M2',
    route: '/search?keyword=STM32',
    viewports: ['desktop', 'mobile'],
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
    id: 'search-filter-panel',
    slice: 'M2',
    route: '/search?keyword=STM32',
    viewports: ['desktop'],
    setup: (page) => showSearchWithFilters(page, 'desktop'),
    region: (page) => page.getByText('Reset Filters', { exact: true }).locator('xpath=ancestor::div[contains(@class, "container")][1]'),
    steps: [
      {
        name: 'checking a filter option searches with it',
        act: async (page, region) => {
          pendingSearch = waitForSearchWith(page, 'LQFP-100');
          await region.getByText('LQFP-100 (3)', { exact: true }).click();
        },
        verify: async () => {
          await pendingSearch;
        },
      },
      {
        name: 'select all searches with every value of a filter',
        act: async (page, region) => {
          pendingSearch = waitForSearchWith(page, 'ARM Cortex-M4');
          await region.getByRole('button', { name: 'Select All' }).last().click();
        },
        verify: async () => {
          await pendingSearch;
        },
      },
      {
        name: 'the filters toggle hides the filter cards',
        act: async (_page, region) => {
          await filtersHeaderRow(region).locator('button').first().click();
        },
        verify: async (_page, region) => {
          await expect(region.getByText('Add/Remove Filter', { exact: true })).toHaveCount(0);
          await expect(region.getByRole('button', { name: 'Select All' })).toHaveCount(0);
        },
        snapshot: (page) =>
          page.getByText('Reset Filters', { exact: true }).locator('xpath=ancestor::div[contains(@class, "container")][1]'),
      },
    ],
  },
  {
    id: 'search-add-remove-filters',
    slice: 'M2',
    route: '/search?keyword=STM32',
    viewports: ['desktop'],
    setup: async (page) => {
      await showSearchWithFilters(page, 'desktop');
      await page.getByText('Add/Remove Filter', { exact: true }).locator('xpath=following-sibling::button').click();
    },
    region: (page) =>
      page.getByText('Add/Remove Filters', { exact: true }).locator('xpath=ancestor::div[contains(@class, "pointer-events-auto")][1]'),
    steps: [
      {
        name: 'searching narrows the parameter list',
        act: async (_page, region) => {
          await region.getByPlaceholder('Search parameters').fill('pack');
        },
        verify: async (_page, region) => {
          await expect(region.getByText('Package', { exact: true })).toBeVisible();
          await expect(region.getByText('Core', { exact: true })).toHaveCount(0);
        },
      },
      {
        name: 'hiding a parameter and saving removes its card',
        act: async (_page, region) => {
          await region.getByPlaceholder('Search parameters').fill('');
          await region.getByText('Core', { exact: true }).click();
          await region.getByRole('button', { name: 'Save' }).click();
        },
        verify: async (page) => {
          await expect(page.getByText('Add/Remove Filters', { exact: true })).toHaveCount(0);
          await expect(page.getByText('Package', { exact: true })).toBeVisible();
          await expect(page.getByText('Core', { exact: true })).toHaveCount(0);
        },
      },
    ],
  },
  {
    id: 'search-filters-sheet-filter',
    slice: 'M2',
    route: '/search?keyword=STM32',
    viewports: ['mobile'],
    setup: async (page) => {
      await showSearchWithFilters(page, 'mobile');
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
    region: (page) =>
      page
        .getByRole('dialog')
        .getByRole('button', { name: /^Max\. forward impulse current/ })
        .first()
        .locator('xpath=ancestor::div[contains(@class, "bg-white")][1]'),
    steps: [
      {
        name: 'expanding a filter shows its options',
        act: async (_page, region) => {
          await region.getByRole('button', { name: /^Max\. forward impulse current/ }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByPlaceholder('Type here')).toBeVisible();
        },
        snapshot: (page) =>
          page.getByRole('dialog').getByPlaceholder('Type here').locator('xpath=ancestor::div[contains(@class, "bg-white")][1]'),
      },
      {
        name: 'checking an option toggles it',
        act: async (_page, region) => {
          await region.getByText('Manufacturer2 (17897)', { exact: true }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('checkbox', { name: 'Manufacturer2 (17897)' })).toBeChecked();
        },
      },
      {
        name: 'typing narrows the options',
        act: async (_page, region) => {
          await region.getByPlaceholder('Type here').fill('Manufacturer3');
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('checkbox')).toHaveCount(1);
          await expect(region.getByRole('checkbox', { name: 'Manufacturer3 (17897)' })).toBeChecked();
        },
      },
    ],
  },
  {
    id: 'search-results-pager',
    slice: 'M2',
    route: '/search',
    viewports: ['desktop', 'mobile'],
    region: (page) => resultsPagerRow(page),
    steps: [
      {
        // The results list remounts while it loads, so the pager returns to page 1 afterwards (pre-existing);
        // the request is the observable outcome.
        name: 'next page requests page 2',
        act: async (page, region) => {
          pendingSearch = waitForSearchWith(page, /[?&]page=2(&|\s|$)/);
          await region.locator('button').last().click();
        },
        verify: async () => {
          await pendingSearch;
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
