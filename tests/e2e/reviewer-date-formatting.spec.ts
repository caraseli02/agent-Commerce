import { expect, test, type Page } from '@playwright/test';

const ISO_TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const signInAsAdmin = async (page: Page) => {
  await page.goto('/?signin=true', { waitUntil: 'networkidle' });

  await page.getByRole('radio', { name: 'Admin Preview' }).click();
  await expect(page.getByLabel('E-mail or client code')).toHaveValue('admin@demo.com');
  await expect(page.getByPlaceholder('Hidden for demo sign-in')).toHaveValue('');

  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await expect(signInButton).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/dashboard\/orders$/),
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
};

const assertNoRawIsoTimestamps = async (page: Page) => {
  const bodyText = await page.locator('body').innerText();

  expect(bodyText).not.toMatch(ISO_TIMESTAMP_PATTERN);
};

test.describe('Reviewer-facing date formatting', () => {
  test('dashboard surfaces show formatted dates on desktop and mobile', async ({ page }) => {
    await signInAsAdmin(page);
    await assertNoRawIsoTimestamps(page);

    await page.goto('/dashboard/customers', { waitUntil: 'domcontentloaded' });
    await assertNoRawIsoTimestamps(page);

    await page.goto('/dashboard/customers/customer-001/control-panel/account', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/credit limit/i).first()).toBeVisible();
    await assertNoRawIsoTimestamps(page);

    await page.goto('/dashboard/customers/customer-001/control-panel/transaction-history', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/\d{1,2} \w+ \d{4}/);
    await assertNoRawIsoTimestamps(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/orders', { waitUntil: 'domcontentloaded' });
    await assertNoRawIsoTimestamps(page);
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  });
});
