import { expect, type Locator, type Page, type Request } from '@playwright/test';
import { clearGuestCart, waitForVisualReady } from '../playwright-support/runtime';
import type { ParityScenario, ParityViewport } from './scenario';
import { c1Scenarios } from './c1-scenarios';
import { c2Scenarios } from './c2-scenarios';
import { c3Scenarios } from './c3-scenarios';

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
/** Region of a control-panel view: the white card that wraps the view under its heading. */
const controlPanelView = (page: Page, heading: string) =>
  page.getByRole('heading', { name: heading, exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]');

/**
 * Every mock customer is a personal account, so the Organization view never renders. M6 serves
 * customer-001 as a business account to client-side requests, then navigates there client-side.
 */
const showBusinessControlPanel = async (page: Page) => {
  await page.route('**/api/dashboard/profile/*/customer-information', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.data.accountType = 2;
    json.data.companyDetails = {
      name: 'Demo Components LLC',
      registrationNumber: 'J40/1234/2024',
      taxId: 'RO12345678',
      vat: 'RO12345678',
      bank_name: 'Demo Bank',
      bank_iban: 'RO49AAAA1B31007593840000',
      address: json.data.personalDetails?.address,
    };
    await route.fulfill({ response, json });
  });
  await page.evaluate(async () => {
    const root = document.querySelector('#__nuxt') as unknown as NuxtRoot;
    await root.__vue_app__.config.globalProperties.$router.push('/dashboard/customers/customer-001/control-panel/organization');
  });
  await expect(page.getByRole('heading', { name: 'Company Details', exact: true })).toBeVisible();
};

/**
 * Mock customers have one (default) address, which renders only the edit control. M6 adds a second,
 * non-default address to client-side address loads so the set-default and delete controls render too.
 */
const showAddressView = async (page: Page, view: 'shipping' | 'billing', heading: string) => {
  await page.route('**/api/dashboard/control-panel/*/personal', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    for (const key of ['shippingAddress', 'billingAddress']) {
      const [first] = json.data[key] ?? [];
      if (first) json.data[key] = [first, { ...first, _id: `${first._id ?? key}-second`, alias: 'Second Address', default: false }];
    }
    await route.fulfill({ response, json });
  });
  await page.evaluate(async (path) => {
    const root = document.querySelector('#__nuxt') as unknown as NuxtRoot;
    await root.__vue_app__.config.globalProperties.$router.push(path);
  }, `/dashboard/customers/customer-001/control-panel/${view}`);
  await expect(page.getByText('Second Address', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
};

const orderFilterTab = (region: Locator, label: string) => region.getByRole('button', { name: new RegExp(`^${label}\\b`) });

const rowMenu = (page: Page, firstItem: string) => page.getByRole('button', { name: firstItem, exact: true }).locator('xpath=..');

const openNewCustomerMenu = async (page: Page) => {
  await page
    .getByText('New Customers', { exact: true })
    .locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]')
    .getByRole('link', { name: /^Melissa Anderson/ })
    .locator('xpath=..')
    .getByRole('button')
    .click();
  await expect(rowMenu(page, 'Profile')).toBeVisible();
};

const openCustomerInformationMenu = async (page: Page) => {
  await page.getByRole('button', { name: 'Open customer information menu' }).click();
  await expect(rowMenu(page, 'Control Panel')).toBeVisible();
};

/** The trigger of a FormSelect: the button right after its text label (B1). */
const formSelectTrigger = (scope: Locator, label: string) =>
  scope.getByText(label, { exact: true }).locator('xpath=following-sibling::button[1]');

/** The account panel's sign-in form (FormPassword, B1). */
const accountSignInForm = (page: Page) => page.getByRole('dialog').locator('form');

const regionalPreferencesSheet = (page: Page) => page.getByRole('dialog', { name: 'Regional Preferences' });

const addShippingAddressDialog = (page: Page) => page.getByRole('dialog', { name: 'Add Shipping Address' });

const orderSummarySelectAll = (page: Page) =>
  page.getByText('Select All', { exact: true }).locator('xpath=ancestor::div[contains(@class, "bg-light-500")][1]');

/** The PDP quantity stepper (GlobalQuantityButtons, B2): decrease, the number input, increase. */
const pdpQuantityStepper = (page: Page) =>
  page.getByTestId('product-purchase-panel').getByRole('button', { name: 'Decrease quantity' }).locator('xpath=..');

/** The open range filter popover (categories/Range and dataTable/filter/Range, B2). */
const rangeFilterPopover = (page: Page) => page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Clear Filter' }) });

/** The search results toolbar: Show, Sort by and Products on page. */
const searchResultsToolbar = (page: Page) =>
  page.getByText('Sort by', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');

/** The mobile-only footer under the results: a second Products on page control and the pager. */
const searchResultsFooter = (page: Page) =>
  page.getByText('Products on page', { exact: true }).last().locator('xpath=ancestor::div[contains(@class, "flex-col")][1]');

/** The dropdown trigger next to a toolbar label; it stays a `<button>` whether custom or a select primitive. */
const searchResultsTrigger = (scope: Locator, label: string) =>
  scope.getByText(label, { exact: true }).locator('xpath=..').locator('button').first();

/** The open dropdown's options; the select primitive portals its listbox out of the toolbar (#647). */
const searchResultsMenu = (page: Page) => page.getByRole('listbox');

/** A dropdown option by its text: inline in the region, or in a portalled listbox (never the select's hidden native `<option>`). */
const searchResultsOption = (page: Page, scope: Locator, name: string) =>
  searchResultsMenu(page)
    .getByRole('option', { name, exact: true })
    .or(scope.getByText(name, { exact: true }).and(scope.locator(':not(option)')));

const showOrderSummaryWithTwoItems = async (page: Page) => {
  await clearGuestCart(page);
  await page.request.post('/api/cart', {
    data: {
      products: ['prod-1', 'prod-2'].map((id) => ({ id, stock: 1, backorder_stock: 0, isFolder: false })),
    },
  });
  await page.goto('/order-summary', { waitUntil: 'domcontentloaded' });
  await waitForVisualReady(page, '/order-summary');
  await expect(orderSummarySelectAll(page)).toBeVisible();
};

export const scenarios: ParityScenario[] = [
  ...c1Scenarios,
  ...c2Scenarios,
  ...c3Scenarios,
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
    // The product page no longer stacks catalog tabs; the home page keeps them.
    route: '/',
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
    route: '/search',
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
    route: '/search',
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
    id: 'storefront-header-search',
    slice: 'M4',
    route: '/',
    viewports: ['desktop'],
    region: (page) => page.locator('header').first(),
    steps: [
      {
        name: 'the regional preferences trigger opens its sheet',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Regional preferences' }).click();
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog').getByText('Regional Preferences')).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(page.getByRole('dialog')).toBeHidden();
        },
      },
      {
        name: 'a keyword search opens the results',
        act: async (_page, region) => {
          await region.getByRole('searchbox').fill('STM32');
          await region.getByRole('searchbox').press('Enter');
        },
        verify: async (page) => {
          await expect(page).toHaveURL(/\/search\?keyword=STM32$/);
        },
      },
    ],
  },
  {
    id: 'storefront-mobile-search',
    slice: 'M4',
    route: '/',
    viewports: ['mobile'],
    region: (page) => page.locator('header').first(),
    steps: [
      {
        name: 'the search trigger opens a focused search box',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Search products' }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('searchbox')).toBeFocused();
          await expect(region.getByRole('button', { name: 'Close search' })).toBeVisible();
        },
        snapshot: (page) => page.locator('header').first(),
      },
      {
        name: 'close search restores the header',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Close search' }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('searchbox')).toBeHidden();
          await expect(region.getByRole('button', { name: 'Search products' })).toBeVisible();
        },
      },
    ],
  },
  {
    id: 'desktop-products-navigation',
    slice: 'M4',
    route: '/',
    viewports: ['desktop'],
    setup: async (page) => {
      await page.getByRole('button', { name: 'Open products navigation' }).click();
      await expect(page.getByRole('navigation', { name: 'Product categories', exact: true }).getByRole('button').first()).toBeVisible();
    },
    region: (page) => page.getByRole('navigation', { name: 'Product categories', exact: true }).locator('xpath=ancestor::section[1]'),
    maxTabStops: 30,
    steps: [
      {
        name: 'selecting a category shows its subcategories',
        act: async (_page, region) => {
          await region.getByRole('button', { name: /^Semiconductors/ }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: /^Semiconductors/ })).toHaveAttribute('aria-pressed', 'true');
          await expect(region.getByRole('button', { name: 'All Categories' })).toBeVisible();
        },
        snapshot: (page) => page.getByRole('navigation', { name: 'Product categories', exact: true }).locator('xpath=ancestor::section[1]'),
      },
      {
        name: 'all categories clears the selection',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'All Categories' }).click();
        },
        // #692: the popover stays open and returns to the root list.
        verify: async (page, region) => {
          await expect(page.getByRole('navigation', { name: 'Product categories', exact: true })).toBeVisible();
          await expect(region.getByRole('button', { name: /^Semiconductors/ })).toHaveAttribute('aria-pressed', 'false');
          await expect(region.getByRole('button', { name: 'All Categories' })).toHaveCount(0);
          await expect(page.getByRole('button', { name: 'Close products navigation' })).toBeVisible();
        },
        snapshot: (page) => page.getByRole('navigation', { name: 'Product categories', exact: true }).locator('xpath=ancestor::section[1]'),
      },
      {
        name: 'an outside click still closes the popover',
        act: async (page) => {
          await page.mouse.click(5, 5);
        },
        verify: async (page) => {
          await expect(page.getByRole('navigation', { name: 'Product categories', exact: true })).toBeHidden();
          await expect(page.getByRole('button', { name: 'Open products navigation' })).toBeVisible();
        },
      },
    ],
  },
  {
    // Signed-in storefront pages log a pre-existing hydration mismatch, so the sheet is exercised from the dashboard header.
    id: 'dashboard-notifications',
    slice: 'M4',
    route: '/dashboard/client?tab=home',
    role: 'customer',
    viewports: ['desktop'],
    setup: async (page) => {
      await expect(page.getByRole('button', { name: 'Open notifications' })).toBeVisible();
    },
    region: (page) => page.getByRole('button', { name: 'Open notifications' }).locator('xpath=..'),
    steps: [
      {
        name: 'the notifications trigger opens the sheet',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Open notifications' }).click();
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog').getByRole('heading', { name: 'Notifications' })).toBeVisible();
        },
        snapshot: (page) => page.getByRole('dialog'),
      },
      {
        name: 'close notifications hides the sheet',
        act: async (page) => {
          await page.getByRole('dialog').getByRole('button', { name: 'Close notifications' }).click();
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog')).toBeHidden();
        },
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
    id: 'dashboard-aside',
    slice: 'M5',
    route: '/dashboard',
    role: 'admin',
    viewports: ['desktop'],
    region: (page) => page.getByRole('complementary'),
    maxTabStops: 15,
    steps: [
      {
        name: 'the collapse control narrows the side navigation to named icons',
        act: async (_page, region) => {
          await region.getByRole('button').last().click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('link', { name: 'Customers' })).toBeVisible();
          await expect(region.getByText('Customers', { exact: true })).toBeHidden();
        },
        snapshot: (page) => page.getByRole('complementary'),
      },
      {
        name: 'the expand control shows the labels again',
        act: async (_page, region) => {
          await region.getByRole('button').last().click();
        },
        verify: async (_page, region) => {
          await expect(region.getByText('Categories', { exact: true })).toBeVisible();
        },
        snapshot: (page) => page.getByRole('complementary'),
      },
    ],
  },
  {
    id: 'dashboard-mobile-header',
    slice: 'M5',
    route: '/dashboard',
    role: 'admin',
    viewports: ['mobile'],
    region: (page) => page.locator('header').first(),
    steps: [
      {
        name: 'the menu button opens the side navigation',
        act: async (_page, region) => {
          await region.getByRole('button').first().click();
        },
        verify: async (page) => {
          await expect(page.getByRole('complementary').getByRole('link', { name: 'Products' })).toBeVisible();
        },
        snapshot: (page) => page.getByRole('complementary'),
      },
      {
        name: 'the close button hides the side navigation',
        act: async (page) => {
          await page.getByRole('complementary').getByRole('button').first().click();
        },
        verify: async (page) => {
          await expect(page.getByRole('complementary')).toBeHidden();
        },
      },
      {
        name: 'the search toggle opens the search box',
        act: async (_page, region) => {
          await region.getByRole('button').nth(1).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('searchbox')).toBeVisible();
        },
        snapshot: (page) => page.locator('header').first(),
      },
      {
        name: 'the clear control empties the search box',
        act: async (_page, region) => {
          await region.getByRole('searchbox').fill('STM32');
          await region.getByRole('searchbox').locator('xpath=ancestor::div[1]').getByRole('button').click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('searchbox')).toHaveValue('');
        },
      },
    ],
  },
  {
    id: 'customers-total-card',
    slice: 'M5',
    route: '/dashboard/customers',
    role: 'admin',
    viewports: ['desktop'],
    // The fake period menu was removed in the UI audit; the card is a plain KPI now.
    region: (page) => page.getByText('Customers Total', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
  },
  {
    id: 'returning-customers-card',
    slice: 'M5',
    route: '/dashboard/customers',
    role: 'admin',
    viewports: ['desktop'],
    region: (page) =>
      page.getByText('Returning Customers', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
  },
  {
    id: 'new-customers-card',
    slice: 'M5',
    route: '/dashboard',
    role: 'admin',
    viewports: ['desktop'],
    region: (page) => page.getByText('New Customers', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
    maxTabStops: 20,
    steps: [
      {
        name: 'a customer row menu opens',
        act: async (_page, region) => {
          await region
            .getByRole('link', { name: /^Melissa Anderson/ })
            .locator('xpath=..')
            .getByRole('button')
            .click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: 'Profile' })).toBeVisible();
        },
        snapshot: (page) =>
          page.getByText('New Customers', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
      },
    ],
  },
  {
    id: 'orders-info-card',
    slice: 'M5',
    route: '/dashboard/orders',
    role: 'admin',
    viewports: ['desktop'],
    // The KPI row replaced the per-card period menus and "More" links.
    region: (page) => page.getByRole('region', { name: 'Order metrics' }),
  },
  {
    id: 'customer-profile-cards',
    slice: 'M5',
    route: '/dashboard/customers/customer-001',
    role: 'admin',
    viewports: ['desktop'],
    region: (page) =>
      page.getByText('Customer Information', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
    steps: [
      {
        name: 'the information menu opens',
        act: async (_page, region) => {
          await region.getByRole('button').first().click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button')).not.toHaveCount(1);
        },
        snapshot: (page) =>
          page.getByText('Customer Information', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
      },
    ],
  },
  {
    id: 'orders-download-control',
    slice: 'M5',
    route: '/dashboard/orders',
    role: 'admin',
    viewports: ['desktop', 'mobile'],
    // Below md the Download All text is hidden, so the button relies on its aria-label.
    region: (page) =>
      page.getByRole('button', { name: 'Download All' }).locator('xpath=ancestor::div[contains(@class, "justify-between")][1]'),
  },
  {
    id: 'customer-net-margin',
    slice: 'M5',
    route: '/dashboard/customers/customer-001',
    role: 'admin',
    viewports: ['desktop'],
    region: (page) => page.getByText('Net Margin', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
  },
  {
    id: 'client-dashboard-sections',
    slice: 'M5',
    route: '/dashboard/client?tab=home',
    role: 'customer',
    viewports: ['desktop', 'mobile'],
    region: (page) => page.getByRole('region', { name: 'Dashboard sections' }),
    steps: [
      {
        name: 'a section tab becomes active',
        act: async (_page, region) => {
          await region.getByRole('button', { name: /^Transaction History/ }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: /^Transaction History/ })).toHaveClass(/(^|\s)text-primary(\s|$)/);
        },
      },
    ],
  },
  {
    id: 'client-activity',
    slice: 'M5',
    route: '/dashboard/client?tab=home',
    role: 'customer',
    viewports: ['desktop'],
    region: (page) => page.getByText('My Activity', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
  },
  {
    id: 'client-account-information',
    slice: 'M5',
    route: '/dashboard/client?tab=home',
    role: 'customer',
    viewports: ['desktop'],
    region: (page) =>
      page.getByText('Account Information', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
    steps: [
      {
        name: 'the information menu opens',
        act: async (_page, region) => {
          await region.getByRole('button').first().click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button')).not.toHaveCount(1);
        },
        snapshot: (page) =>
          page.getByText('Account Information', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
      },
    ],
  },
  {
    id: 'client-recently-bought',
    slice: 'M5',
    route: '/dashboard/client?tab=home',
    role: 'customer',
    viewports: ['desktop'],
    region: (page) =>
      page
        .locator('header')
        .filter({ hasText: /^Recently Bought$/ })
        .locator('xpath=..'),
    steps: [
      {
        name: 'view orders switches to the orders section',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'View Orders' }).click();
        },
        verify: async (page) => {
          await expect(page.getByRole('region', { name: 'Dashboard sections' }).getByRole('button', { name: /^Orders/ })).toHaveClass(
            /text-primary/,
          );
        },
      },
    ],
  },
  {
    id: 'client-hot-sale-banner',
    slice: 'M5',
    route: '/dashboard/client?tab=home',
    role: 'customer',
    viewports: ['desktop'],
    region: (page) => page.getByRole('group', { name: '1 / 5' }),
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
      {
        name: 'cancel leaves edit mode',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Cancel' }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: 'Save' })).toBeHidden();
          await expect(region.getByRole('button', { name: 'Edit' })).toBeVisible();
        },
      },
    ],
  },
  {
    id: 'control-panel-account-details-mobile',
    slice: 'M6',
    route: '/dashboard/customers/customer-001/control-panel/account',
    role: 'admin',
    viewports: ['mobile'],
    region: (page) => page.getByRole('heading', { name: 'Account Details' }).locator('xpath=..'),
  },
  {
    id: 'control-panel-company-details',
    slice: 'M6',
    route: '/dashboard/customers/customer-001/control-panel/account',
    role: 'admin',
    viewports: ['desktop'],
    setup: showBusinessControlPanel,
    region: (page) => controlPanelView(page, 'Company Details'),
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
        snapshot: (page) => controlPanelView(page, 'Company Details'),
      },
      {
        name: 'cancel leaves edit mode',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Cancel' }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: 'Save' })).toBeHidden();
        },
      },
    ],
  },
  ...(
    [
      ['shipping', 'Shipping'],
      ['billing', 'Billing'],
    ] as const
  ).map(([view, heading]): ParityScenario => ({
    id: `control-panel-${view}-addresses`,
    slice: 'M6',
    route: '/dashboard/customers/customer-001/control-panel/account',
    role: 'admin',
    viewports: ['desktop', 'mobile'],
    setup: (page) => showAddressView(page, view, heading),
    region: (page) => controlPanelView(page, heading),
    steps: [
      {
        name: 'the add control opens the add dialog',
        act: async (_page, region) => {
          await region.getByRole('button').last().click();
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog', { name: `Add ${heading} Address` })).toBeVisible();
        },
      },
      {
        name: 'closing the add dialog hides it',
        act: async (page) => {
          await page
            .getByRole('dialog', { name: `Add ${heading} Address` })
            .getByRole('button', { name: 'Close' })
            .click();
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog')).toBeHidden();
        },
      },
      {
        name: 'the second control of an address row opens the edit dialog',
        act: async (_page, region) => {
          await region
            .getByText('Second Address', { exact: true })
            .locator('xpath=ancestor::div[contains(@class, "border-dashed")][1]')
            .getByRole('button')
            .nth(1)
            .click();
        },
        verify: async (page) => {
          const dialog = page.getByRole('dialog', { name: `Edit ${heading} Details` });
          await expect(dialog).toBeVisible();
          await expect(dialog.getByPlaceholder('Address Alias 1')).toHaveValue('Second Address');
        },
      },
    ],
  })),
  {
    id: 'orders-filter-tabs',
    slice: 'M7',
    route: '/dashboard/orders',
    role: 'admin',
    viewports: ['desktop', 'mobile'],
    region: (page) => page.getByTestId('order-filter-tabs'),
    maxTabStops: 12,
    steps: [
      {
        name: 'a filter tab becomes the active filter',
        act: async (page, region) => {
          await Promise.all([
            page.waitForResponse((response) => response.url().includes('/api/orders') && response.ok()),
            orderFilterTab(region, 'Delivered').click(),
          ]);
        },
        verify: async (_page, region) => {
          await expect(orderFilterTab(region, 'Delivered')).toHaveAttribute('aria-pressed', 'true');
          await expect(orderFilterTab(region, 'All orders')).toHaveAttribute('aria-pressed', 'false');
        },
      },
    ],
  },
  {
    id: 'new-customer-row-menu',
    slice: 'M7',
    route: '/dashboard',
    role: 'admin',
    viewports: ['desktop'],
    setup: openNewCustomerMenu,
    region: (page) => rowMenu(page, 'Profile'),
    steps: [
      {
        name: 'the orders item closes the menu',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Orders', exact: true }).click();
        },
        verify: async (page) => {
          await expect(rowMenu(page, 'Profile')).toBeHidden();
        },
      },
      {
        name: 'the profile item opens the customer profile',
        act: async (page) => {
          await openNewCustomerMenu(page);
          await rowMenu(page, 'Profile').getByRole('button', { name: 'Profile', exact: true }).click();
        },
        verify: async (page) => {
          await expect(page).toHaveURL(/\/dashboard\/customers\/[^/]+$/);
        },
      },
    ],
  },
  {
    id: 'customer-information-menu',
    slice: 'M7',
    route: '/dashboard/customers/customer-001',
    role: 'admin',
    viewports: ['desktop', 'mobile'],
    setup: openCustomerInformationMenu,
    region: (page) => rowMenu(page, 'Control Panel'),
    steps: [
      {
        name: 'the control panel item opens the control panel',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Control Panel', exact: true }).click();
        },
        verify: async (page) => {
          await expect(page).toHaveURL(/\/dashboard\/customers\/customer-001\/control-panel/);
        },
      },
    ],
  },
  {
    id: 'order-summary-select-all',
    slice: 'M7',
    route: '/',
    viewports: ['desktop', 'mobile'],
    setup: showOrderSummaryWithTwoItems,
    region: orderSummarySelectAll,
    steps: [
      {
        name: 'select all selects every item',
        act: async (_page, region) => {
          // Before M7 the native checkbox is sr-only under its label, so click where the user does.
          await region.getByRole('checkbox').click({ force: true });
        },
        verify: async (_page, region) => {
          await expect(region.getByText('2', { exact: true })).toBeVisible();
          await expect(region.getByRole('button', { name: 'Delete Selected' })).toBeEnabled();
        },
        snapshot: orderSummarySelectAll,
      },
      {
        name: 'select all again clears the selection',
        act: async (_page, region) => {
          // Before M7 the native checkbox is sr-only under its label, so click where the user does.
          await region.getByRole('checkbox').click({ force: true });
        },
        verify: async (_page, region) => {
          await expect(region.getByText('2', { exact: true })).toBeHidden();
          await expect(region.getByRole('button', { name: 'Delete Selected' })).toBeDisabled();
        },
        snapshot: orderSummarySelectAll,
      },
    ],
  },
  {
    id: 'account-sign-in-form',
    slice: 'B1',
    route: '/',
    viewports: ['desktop', 'mobile'],
    setup: async (page) => {
      await page.getByRole('button', { name: 'Open my account' }).click();
      await expect(page.getByRole('radio', { name: 'Customer Demo' })).toBeVisible();
    },
    region: accountSignInForm,
    steps: [
      {
        name: 'the eye toggle reveals the password',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Show password' }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
          await expect(region.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
        },
        snapshot: accountSignInForm,
      },
      {
        name: 'the eye toggle hides the password again',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Hide password' }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'false');
          await expect(region.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
        },
      },
    ],
  },
  {
    id: 'regional-preferences-currency',
    slice: 'B1',
    route: '/',
    viewports: ['desktop'],
    setup: async (page) => {
      await page.getByRole('button', { name: 'Regional preferences' }).click();
      await expect(regionalPreferencesSheet(page)).toBeVisible();
    },
    region: regionalPreferencesSheet,
    // The sheet traps focus, so the walk would loop; one cycle covers every stop.
    maxTabStops: 4,
    steps: [
      {
        name: 'the currency select opens its options',
        act: async (_page, region) => {
          await formSelectTrigger(region, 'Demo currency').click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: 'EURO', exact: true })).toBeVisible();
        },
        snapshot: regionalPreferencesSheet,
      },
      {
        name: 'choosing an option closes the menu and shows it',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'EURO', exact: true }).click();
        },
        verify: async (_page, region) => {
          await expect(formSelectTrigger(region, 'Demo currency')).toHaveText('EURO');
          await expect(region.getByRole('button', { name: 'USD', exact: true })).toBeHidden();
        },
        snapshot: regionalPreferencesSheet,
      },
    ],
  },
  {
    id: 'control-panel-account-country-select',
    slice: 'B1',
    route: '/dashboard/customers/customer-001/control-panel/account',
    role: 'admin',
    viewports: ['desktop'],
    setup: async (page) => {
      await controlPanelView(page, 'Account Details').getByRole('button', { name: 'Edit' }).click();
    },
    region: (page) => controlPanelView(page, 'Account Details'),
    maxTabStops: 30,
    steps: [
      {
        name: 'the country select opens with a search field',
        act: async (_page, region) => {
          await formSelectTrigger(region, 'Country').click();
        },
        verify: async (_page, region) => {
          await expect(region.getByPlaceholder('Search Country')).toBeVisible();
        },
        snapshot: (page) => controlPanelView(page, 'Account Details'),
      },
      {
        name: 'searching filters the country options',
        act: async (_page, region) => {
          await region.getByPlaceholder('Search Country').fill('Roman');
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('button', { name: 'Romania Romania', exact: true })).toBeVisible();
          await expect(region.getByRole('button', { name: 'Germany Germany', exact: true })).toBeHidden();
        },
        snapshot: (page) => controlPanelView(page, 'Account Details'),
      },
    ],
  },
  {
    id: 'control-panel-add-address-dialog',
    slice: 'B1',
    route: '/dashboard/customers/customer-001/control-panel/account',
    role: 'admin',
    viewports: ['desktop'],
    setup: async (page) => {
      await showAddressView(page, 'shipping', 'Shipping');
      await controlPanelView(page, 'Shipping').getByRole('button').last().click();
      await expect(addShippingAddressDialog(page)).toBeVisible();
    },
    region: addShippingAddressDialog,
    // The dialog traps focus, so the walk would loop; one cycle covers every stop.
    maxTabStops: 10,
    steps: [
      {
        name: 'the country select opens with a search field',
        act: async (_page, region) => {
          await formSelectTrigger(region, 'Country').click();
        },
        verify: async (_page, region) => {
          await expect(region.getByPlaceholder('Search Country')).toBeVisible();
        },
        snapshot: addShippingAddressDialog,
      },
    ],
  },
  {
    id: 'client-settings-account-details',
    slice: 'B1',
    route: '/dashboard/client',
    role: 'customer',
    viewports: ['desktop'],
    setup: async (page) => {
      await page.getByTestId('client-dashboard-tabs').getByRole('button', { name: 'Settings' }).click();
      await expect(page.getByRole('heading', { name: 'Account Details', exact: true })).toBeVisible();
    },
    region: (page) => page.getByRole('heading', { name: 'Account Details', exact: true }).locator('xpath=ancestor::section[1]'),
  },
  {
    id: 'pdp-quantity-stepper',
    slice: 'B2',
    route: '/product/prod-1',
    viewports: ['desktop', 'mobile'],
    region: pdpQuantityStepper,
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
      {
        name: 'a typed quantity is kept',
        act: async (_page, region) => {
          await region.getByRole('spinbutton', { name: 'Quantity' }).fill('5');
          await region.getByRole('spinbutton', { name: 'Quantity' }).press('Tab');
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('5');
          await expect(region.getByRole('spinbutton', { name: 'Quantity' })).toHaveAttribute('aria-invalid', 'false');
        },
        snapshot: pdpQuantityStepper,
      },
      {
        name: 'an out-of-range quantity shows an error and reverts',
        act: async (_page, region) => {
          await region.getByRole('spinbutton', { name: 'Quantity' }).fill('0');
          await region.getByRole('spinbutton', { name: 'Quantity' }).press('Tab');
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('alert')).toHaveText(/^Enter a whole number from \d+/);
          await expect(region.getByRole('spinbutton', { name: 'Quantity' })).toHaveAttribute('aria-invalid', 'true');
          await expect(region.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('5');
        },
        snapshot: pdpQuantityStepper,
      },
      {
        name: 'decrease quantity clears the error',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Decrease quantity' }).click();
        },
        verify: async (_page, region) => {
          await expect(region.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('4');
        },
      },
    ],
  },
  {
    id: 'categories-items-total-range',
    slice: 'B2',
    route: '/dashboard/products/categories',
    role: 'admin',
    viewports: ['desktop'],
    setup: async (page) => {
      await page.getByRole('button', { name: 'Items Total' }).click();
      await expect(rangeFilterPopover(page)).toBeVisible();
    },
    region: rangeFilterPopover,
    // The popover traps focus, so the walk would loop; one cycle covers every stop.
    maxTabStops: 5,
    steps: [
      {
        name: 'typed bounds show on the trigger',
        act: async (_page, region) => {
          await region.getByRole('spinbutton').first().fill('10');
          await region.getByRole('spinbutton').last().fill('500');
        },
        verify: async (page, region) => {
          await expect(region.getByText('10', { exact: true })).toBeVisible();
          await expect(region.getByText('500', { exact: true })).toBeVisible();
          await expect(page.getByRole('button', { name: /Items Total/ })).toContainText('Min: 10');
          await expect(page.getByRole('button', { name: /Items Total/ })).toContainText('Max: 500');
        },
        snapshot: rangeFilterPopover,
      },
      {
        // The min stays a number: a typed 0 equals the reset value, so its badge goes away.
        name: 'a typed zero minimum hides its badge',
        act: async (_page, region) => {
          await region.getByRole('spinbutton').first().fill('0');
        },
        verify: async (page) => {
          await expect(page.getByRole('button', { name: /Items Total/ })).not.toContainText('Min:');
          await expect(page.getByRole('button', { name: /Items Total/ })).toContainText('Max: 500');
        },
      },
      {
        name: 'clear filter resets both bounds',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Clear Filter' }).click();
        },
        verify: async (page, region) => {
          await expect(region.getByRole('spinbutton').first()).toHaveValue('0');
          await expect(region.getByRole('spinbutton').last()).toHaveValue('0');
          await expect(page.getByRole('button', { name: /Items Total/ })).not.toContainText('Max:');
        },
        snapshot: rangeFilterPopover,
      },
    ],
  },
  {
    id: 'orders-total-range-filter',
    slice: 'B2',
    route: '/dashboard/orders',
    role: 'admin',
    viewports: ['desktop'],
    setup: async (page) => {
      await page.getByRole('button', { name: 'Total', exact: true }).click();
      await expect(rangeFilterPopover(page)).toBeVisible();
    },
    region: rangeFilterPopover,
    // The popover traps focus, so the walk would loop; one cycle covers every stop.
    maxTabStops: 5,
    steps: [
      {
        name: 'typed bounds follow the slider labels',
        act: async (_page, region) => {
          await region.getByRole('spinbutton').first().fill('10');
          await region.getByRole('spinbutton').last().fill('500');
        },
        verify: async (_page, region) => {
          await expect(region.getByText('$10', { exact: true })).toBeVisible();
          await expect(region.getByText('$500', { exact: true })).toBeVisible();
        },
        snapshot: rangeFilterPopover,
      },
      {
        // The min stays a number: an applied 0 is falsy, so only the max badge shows.
        name: 'apply with a zero minimum shows only the max badge',
        act: async (_page, region) => {
          await region.getByRole('spinbutton').first().fill('0');
          await region.getByRole('button', { name: 'Apply' }).click();
        },
        verify: async (page) => {
          await expect(rangeFilterPopover(page)).toBeHidden();
          await expect(page.getByRole('button', { name: /^Total/ })).toContainText('Max: 500');
          await expect(page.getByRole('button', { name: /^Total/ })).not.toContainText('Min:');
        },
      },
    ],
  },
  {
    id: 'search-results-toolbar',
    slice: 'B3',
    route: '/search?keyword=STM32',
    viewports: ['desktop', 'mobile'],
    region: searchResultsToolbar,
    steps: [
      {
        name: 'the show menu lists the product filters',
        act: async (_page, region) => {
          await searchResultsTrigger(region, 'Show').click();
        },
        verify: async (page, region) => {
          await expect(searchResultsOption(page, region, 'Available in stock')).toBeVisible();
        },
        snapshot: searchResultsMenu,
      },
      {
        name: 'choosing a show filter searches with it',
        act: async (page, region) => {
          pendingSearch = waitForSearchWith(page, 'stockFrom=1');
          await searchResultsOption(page, region, 'Available in stock').click();
        },
        verify: async (page) => {
          await pendingSearch;
          await expect(searchResultsToolbar(page)).toBeVisible();
        },
      },
      {
        name: 'the sort menu lists every sort order',
        act: async (page) => {
          await searchResultsTrigger(searchResultsToolbar(page), 'Sort by').click();
        },
        verify: async (page) => {
          await expect(searchResultsOption(page, searchResultsToolbar(page), 'Price High–Low')).toBeVisible();
        },
        snapshot: searchResultsMenu,
      },
      {
        name: 'choosing a sort order searches with it',
        act: async (page) => {
          pendingSearch = waitForSearchWith(page, /sortBy=price&sortOrder=asc/);
          await searchResultsOption(page, searchResultsToolbar(page), 'Price Low–High').click();
        },
        verify: async (page) => {
          await pendingSearch;
          await expect(searchResultsToolbar(page)).toBeVisible();
        },
      },
      {
        name: 'the per-page menu lists the page sizes',
        act: async (page) => {
          await searchResultsTrigger(searchResultsToolbar(page), 'Products on page').click();
        },
        verify: async (page) => {
          await expect(searchResultsOption(page, searchResultsToolbar(page), '50')).toBeVisible();
        },
        snapshot: searchResultsMenu,
      },
      {
        name: 'choosing a page size searches with it',
        act: async (page) => {
          pendingSearch = waitForSearchWith(page, 'perPage=20');
          await searchResultsOption(page, searchResultsToolbar(page), '20').click();
        },
        verify: async (page) => {
          await pendingSearch;
          await expect(searchResultsToolbar(page)).toBeVisible();
        },
      },
    ],
  },
  {
    id: 'search-results-footer-per-page',
    slice: 'B3',
    route: '/search?keyword=STM32',
    viewports: ['mobile'],
    region: searchResultsFooter,
    steps: [
      {
        name: 'the footer per-page menu lists the page sizes',
        act: async (_page, region) => {
          await searchResultsTrigger(region, 'Products on page').click();
        },
        verify: async (page, region) => {
          await expect(searchResultsOption(page, region, '50')).toBeVisible();
        },
        snapshot: searchResultsMenu,
      },
      {
        name: 'choosing a footer page size searches with it',
        act: async (page, region) => {
          pendingSearch = waitForSearchWith(page, 'perPage=50');
          await searchResultsOption(page, region, '50').click();
        },
        verify: async (page) => {
          await pendingSearch;
          await expect(searchResultsFooter(page)).toBeVisible();
        },
      },
    ],
  },
];
