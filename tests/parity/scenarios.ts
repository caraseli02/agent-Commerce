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

/** Distinct values that collapse to the same text once punctuation is replaced (#678 review). */
const collidingFiltersFixture = {
  Pitch: [filterValue('Pitch', 'A.B', '', 'pitch', 2), filterValue('Pitch', 'A-B', '', 'pitch', 3)],
};

/** Serves search responses with the filter fixture, then runs a client-side search so the filter UI renders. */
const showSearchWithFilters = async (page: Page, viewport: ParityViewport, filters: object = searchFiltersFixture) => {
  await page.route('**/api/products/search**', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.data.filters = structuredClone(filters);
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

/** The text a search request carries: decoded query string plus body. */
const searchRequestText = (request: Request) => `${decodeURIComponent(request.url())} ${request.postData() ?? ''}`;

/** Waits for a search request whose query string or body matches `pattern`. */
const waitForSearchWith = (page: Page, pattern: string | RegExp) =>
  page.waitForRequest((request) => {
    if (!request.url().includes('/api/products/search')) return false;
    const sent = searchRequestText(request);
    return typeof pattern === 'string' ? sent.includes(pattern) : pattern.test(sent);
  });

/** Set by a step's `act`, awaited by its `verify`. */
let pendingSearch: Promise<Request> | undefined;

/** The results header row: "Products Found (n)" and the pager with its previous/next icon buttons. */
const resultsPagerRow = (page: Page) =>
  page.getByText(/^Products Found \(/).locator('xpath=parent::div[contains(@class, "md:justify-between")]');

const filtersHeaderRow = (region: Locator) =>
  region.getByText('Reset Filters', { exact: true }).locator('xpath=ancestor::div[contains(@class, "justify-between")][1]');

/** The tab-order walk slides the home carousel to a later card; reload so the card is back at the start. */
const bringCardIntoView = async (page: Page, card: Locator) => {
  await page.reload({ waitUntil: 'networkidle' });
  await expect(card).toBeInViewport();
};

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
    id: 'search-filter-colliding-values',
    slice: 'M2',
    route: '/search?keyword=STM32',
    viewports: ['desktop'],
    setup: (page) => showSearchWithFilters(page, 'desktop', collidingFiltersFixture),
    region: (page) => page.getByText('Pitch', { exact: true }).locator('xpath=ancestor::div[contains(@class, "flex-col")][1]'),
    steps: [
      {
        name: 'each value label checks its own value',
        act: async (page, region) => {
          pendingSearch = waitForSearchWith(page, /A[.-]B/);
          await region.getByText('A-B (3)', { exact: true }).click();
        },
        verify: async (_page, region) => {
          const sent = searchRequestText(await pendingSearch!);
          expect(sent).toContain('A-B');
          expect(sent).not.toContain('A.B');
          const ids = await region.getByRole('checkbox').evaluateAll((boxes) => boxes.map((box) => box.id).filter(Boolean));
          expect(new Set(ids).size, 'checkbox ids are unique').toBe(ids.length);
        },
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
        name: 'clicking the search icon focuses the search box',
        act: async (_page, region) => {
          await region.getByPlaceholder('Search parameters').locator('xpath=preceding-sibling::*[1]').click();
        },
        verify: async (_page, region) => {
          await expect(region.getByPlaceholder('Search parameters')).toBeFocused();
        },
      },
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
    id: 'product-gallery',
    slice: 'M3',
    route: '/product/prod-1',
    viewports: ['desktop', 'mobile'],
    region: (page) => page.getByRole('button', { name: 'Share product' }).locator('xpath=ancestor::div[contains(@class, "shadow-m")][1]'),
    steps: [
      {
        name: 'the 3D preview button opens its dialog',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'View 3D preview' }).click();
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog').getByRole('heading', { name: '3D preview' })).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(page.getByRole('dialog')).toHaveCount(0);
        },
      },
      {
        name: 'the main image opens the zoom gallery',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Open product image gallery' }).click();
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog')).toBeVisible();
        },
      },
    ],
  },
  {
    id: 'product-details',
    slice: 'M3',
    route: '/product/prod-1',
    viewports: ['desktop', 'mobile'],
    region: (page) => page.getByRole('heading', { level: 1 }).locator('xpath=ancestor::div[contains(@class, "shadow-m")][1]'),
    steps: [
      {
        name: 'the copy button copies the product name',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Copy STM32F407VGT6 Microcontroller' }).click();
        },
        verify: async (page) => {
          await expect(page.getByText('Text copied!', { exact: true })).toBeVisible();
        },
      },
      {
        name: 'the custom code button opens the custom code modal',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Your Custom Code' }).click();
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog')).toBeVisible();
        },
      },
    ],
  },
  {
    id: 'product-specifications-table',
    slice: 'M3',
    route: '/product/prod-1',
    viewports: ['desktop', 'mobile'],
    region: (page) =>
      page.getByRole('button', { name: 'Specifications', exact: true }).locator('xpath=ancestor::div[contains(@class, "shadow-m")][1]'),
    steps: [
      {
        name: 'the checkbox includes a feature',
        act: async (_page, region) => {
          // The native checkbox is visually hidden; users click the box drawn in its cell.
          await region.getByRole('cell', { name: 'Include Core in similar-product search' }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('checkbox', { name: 'Include Core in similar-product search' })).toBeChecked();
        },
      },
      {
        name: 'clicking a row toggles its feature',
        act: async (_page, region) => {
          await region.getByRole('cell', { name: 'Flash', exact: true }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('checkbox', { name: 'Include Flash in similar-product search' })).toBeChecked();
          await expect(region.getByRole('checkbox', { name: 'Include Core in similar-product search' })).toBeChecked();
        },
      },
      {
        name: 'clicking the row again clears it',
        act: async (_page, region) => {
          await region.getByRole('cell', { name: 'Flash', exact: true }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('checkbox', { name: 'Include Flash in similar-product search' })).not.toBeChecked();
        },
      },
    ],
  },
  {
    id: 'product-blocks-tabs',
    slice: 'M3',
    route: '/product/prod-1',
    viewports: ['desktop', 'mobile'],
    region: (page) =>
      page.getByRole('button', { name: 'Best Sellers', exact: true }).locator('xpath=ancestor::div[contains(@class, "md:flex-row")][1]'),
    steps: [
      {
        name: 'choosing a tab makes it the active tab',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Best Sellers', exact: true }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: 'Best Sellers', exact: true })).toHaveClass(/text-blue-700/);
          await expect(region.getByRole('button', { name: 'Featured', exact: true })).toHaveClass(/text-slate-500/);
        },
      },
    ],
  },
  {
    id: 'product-card',
    slice: 'M3',
    route: '/',
    viewports: ['desktop'],
    setup: async (page) => {
      await clearGuestCart(page);
      await page.reload({ waitUntil: 'networkidle' });
    },
    region: (page) =>
      page
        .getByRole('button', { name: 'Add STM32F407VGT6 Microcontroller to cart' })
        .first()
        .locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
    steps: [
      {
        name: 'add to cart updates the header cart',
        act: async (page, region) => {
          await bringCardIntoView(page, region);
          await Promise.all([
            page.waitForResponse((response) => response.url().includes('/api/cart') && response.request().method() === 'POST'),
            region.getByRole('button', { name: 'Add STM32F407VGT6 Microcontroller to cart' }).click(),
          ]);
        },
        verify: async (page) => {
          await expect(page.getByRole('button', { name: 'Open shopping cart' })).toContainText('1');
        },
      },
    ],
  },
  {
    id: 'product-card-options',
    slice: 'M3',
    route: '/',
    viewports: ['mobile'],
    region: (page) =>
      page
        .getByRole('button', { name: 'Add STM32F407VGT6 Microcontroller to cart' })
        .first()
        .locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
    steps: [
      {
        name: 'the options button opens the card menu',
        act: async (page, region) => {
          await bringCardIntoView(page, region);
          await region.getByRole('button', { name: 'Product options' }).click();
        },
        verify: async (page) => {
          await expect(page.getByRole('menuitem', { name: 'Share' })).toBeVisible();
          await expect(page.getByRole('menuitem', { name: '3D view' })).toBeVisible();
        },
      },
    ],
  },
  {
    id: 'quick-buy-mobile-trigger',
    slice: 'M3',
    route: '/product/prod-1',
    viewports: ['mobile'],
    region: (page) => page.getByRole('heading', { name: 'Quick Buy', level: 2 }).locator('xpath=ancestor::section[1]'),
    steps: [
      {
        name: 'the add to cart trigger opens the quick buy dialog',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Add to cart' }).click();
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog').getByRole('heading', { name: 'Quick buy' })).toBeVisible();
          // The dialog rows reuse the inline form's input ids, so their labels point at the hidden form (pre-existing).
          await expect(page.getByRole('dialog').getByPlaceholder('Manufacturer part number').first()).toBeVisible();
        },
        snapshot: (page) => page.getByRole('dialog'),
      },
    ],
  },
  {
    id: 'quick-buy-form',
    slice: 'M3',
    route: '/product/prod-1',
    viewports: ['desktop'],
    region: (page) => page.getByRole('heading', { name: 'Quick Buy', level: 2 }).locator('xpath=ancestor::section[1]'),
  },
  {
    id: 'home-hero-search',
    slice: 'M3',
    route: '/',
    viewports: ['desktop', 'mobile'],
    region: (page) => page.locator('form').filter({ has: page.getByRole('searchbox', { name: 'Search by part number or keyword' }) }),
    steps: [
      {
        name: 'an empty search shows an error and focuses the search box',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Search catalog' }).click();
        },
        verify: async (page, region) => {
          await expect(region.getByRole('alert')).toHaveText('Enter a part number or keyword to search.');
          await expect(region.getByRole('searchbox', { name: 'Search by part number or keyword' })).toBeFocused();
          await expect(page).toHaveURL(/\/$/);
        },
        snapshot: (page) => page.locator('form').filter({ has: page.getByRole('searchbox', { name: 'Search by part number or keyword' }) }),
      },
      {
        name: 'a keyword search opens the results',
        act: async (_page, region) => {
          await region.getByRole('searchbox', { name: 'Search by part number or keyword' }).fill('STM32');
          await region.getByRole('searchbox', { name: 'Search by part number or keyword' }).press('Enter');
        },
        verify: async (page) => {
          await expect(page).toHaveURL(/\/search\?keyword=STM32$/);
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
