import { expect, type Locator, type Page } from '@playwright/test';
import type { ParityScenario } from './scenario';

type NuxtRoot = { __vue_app__: { config: { globalProperties: { $router: { push: (to: string) => Promise<unknown> } } } } };

const dashboardCreditCard = (page: Page) =>
  page
    .getByRole('button', { name: 'Pay now', exact: true })
    .filter({ visible: true })
    .locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]');

const recentTransactions = (page: Page) =>
  page.getByText('Recent Transactions', { exact: true }).locator('xpath=ancestor::div[contains(@class, "bg-card")][1]');

const customerNotes = (page: Page) => page.getByRole('heading', { name: 'Customer Notes', exact: true }).locator('xpath=..');

const openCustomerProfile = async (page: Page) => {
  await page.route('**/api/dashboard/profile/customer-001/recent-transactions', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: [
          { _id: 'c3-transaction-paid', amount: 125.5, status: 1 },
          { _id: 'c3-transaction-declined', amount: 42, status: 3 },
        ],
      }),
    }),
  );
  await page.evaluate(async () => {
    const root = document.querySelector('#__nuxt') as unknown as NuxtRoot;
    await root.__vue_app__.config.globalProperties.$router.push('/dashboard/customers/customer-001');
  });
  await expect(page.getByText('Recent Transactions', { exact: true })).toBeVisible();
};

const verifyDisabledNotes = async (page: Page, region: Locator) => {
  const notes = region.getByRole('textbox');
  await expect(notes).toBeDisabled();
  await expect(notes).toHaveAttribute('placeholder', /.+/);
};

/** Baselines for the dashboard credit, payment-card, customer-profile, and order-confirm C3 migration. */
export const c3Scenarios: ParityScenario[] = [
  {
    id: 'C3-dashboard-credit-summary',
    slice: 'C3',
    route: '/dashboard/client?tab=home',
    role: 'customer',
    viewports: ['desktop', 'mobile'],
    region: dashboardCreditCard,
    steps: [
      {
        name: 'Pay now retains native form submission',
        act: async (page, region) => {
          await region.locator('form').evaluate((form) => {
            form.addEventListener('submit', (event) => {
              event.preventDefault();
              form.setAttribute('data-parity-submits', String(Number(form.getAttribute('data-parity-submits') || 0) + 1));
            });
          });
          await region.getByRole('button', { name: 'Pay now', exact: true }).focus();
          await page.keyboard.press('Enter');
        },
        verify: async (_page, region) => {
          await expect(region.locator('form')).toHaveAttribute('data-parity-submits', '1');
          await expect(region.getByRole('button', { name: 'Pay now', exact: true })).toHaveAttribute('type', 'submit');
        },
      },
    ],
  },
  {
    id: 'C3-payment-card-transactions-navigation',
    slice: 'C3',
    route: '/dashboard/client?tab=home',
    role: 'customer',
    viewports: ['desktop', 'mobile'],
    region: (page) => page.getByText('Card', { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]'),
    steps: [
      {
        name: 'transactions action keeps the current dashboard view',
        act: async (_page, region) => {
          await region.getByRole('button', { name: 'Transactions', exact: true }).click();
        },
        verify: async (page) => {
          // The current emitter has no active listener in TabBar, so this action is presently a no-op.
          await expect(page).toHaveURL(/\/dashboard\/client\?tab=home$/);
          await expect(dashboardCreditCard(page)).toBeVisible();
        },
      },
    ],
  },
  {
    id: 'C3-payment-add-card-dialog',
    slice: 'C3',
    route: '/dashboard/client?tab=settings',
    role: 'customer',
    viewports: ['desktop', 'mobile'],
    region: (page) => page.locator('#payments'),
    steps: [
      {
        name: 'add-card trigger opens by keyboard',
        act: async (page, region) => {
          const trigger = region.locator('section.border-dashed').getByRole('button');
          await trigger.focus();
          await page.keyboard.press('Enter');
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog', { name: 'Add New Card' })).toBeVisible();
        },
        snapshot: (page) => page.getByRole('dialog', { name: 'Add New Card' }),
      },
      {
        name: 'Escape closes the add-card dialog',
        act: async (page) => {
          await page.keyboard.press('Escape');
        },
        verify: async (page) => {
          await expect(page.getByRole('dialog', { name: 'Add New Card' })).toBeHidden();
        },
      },
    ],
  },
  {
    id: 'C3-customer-recent-transactions-disabled-more',
    slice: 'C3',
    route: '/dashboard/customers',
    role: 'admin',
    viewports: ['desktop', 'mobile'],
    setup: openCustomerProfile,
    region: recentTransactions,
    steps: [
      {
        name: 'view-more remains disabled with transaction rows present',
        act: async () => {},
        verify: async (_page, region) => {
          await expect(region.getByText('Paid', { exact: true })).toBeVisible();
          await expect(region.getByText('Declined', { exact: true })).toBeVisible();
          await expect(region.getByRole('button', { name: /View more/ })).toBeDisabled();
        },
      },
    ],
  },
  {
    id: 'C3-buyer-order-confirm-disabled-notes',
    slice: 'C3',
    route: '/order-summary/ord-1',
    role: 'customer',
    viewports: ['desktop', 'mobile'],
    region: customerNotes,
    steps: [
      {
        name: 'customer notes textarea is disabled',
        act: async () => {},
        verify: verifyDisabledNotes,
      },
    ],
  },
  {
    id: 'C3-admin-order-confirm-disabled-notes',
    slice: 'C3',
    route: '/dashboard/orders/ord-1',
    role: 'admin',
    viewports: ['desktop', 'mobile'],
    region: customerNotes,
    steps: [
      {
        name: 'customer notes textarea is disabled',
        act: async () => {},
        verify: verifyDisabledNotes,
      },
    ],
  },
];
