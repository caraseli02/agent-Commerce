import { expect, test, type Page } from '@playwright/test';

const signInAsAdmin = async (page: Page) => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  const loginResponse = await page.request.post(`${baseURL}/api/auth/login`, {
    data: { email: 'admin@demo.com', password: 'admin123' },
  });
  const { token } = (await loginResponse.json()) as { token: string };

  await page.context().addCookies([
    {
      name: 'token',
      value: token,
      domain: new URL(baseURL).hostname,
      path: '/',
    },
  ]);
};

const fillAddAddressForm = async (page: Page, alias: string, type: 'Shipping' | 'Billing') => {
  const addModal = page.locator('div.fixed.z-\\[60\\]').filter({ hasText: `Add ${type} Address` });
  await expect(addModal).toBeVisible();

  await addModal.getByPlaceholder('Address Alias 1').fill(alias);
  await addModal.getByRole('button', { name: 'New York' }).click();
  await page.getByRole('button', { name: 'California', exact: true }).click();
  await addModal.getByPlaceholder('Bucharest').fill('San Francisco');
  await addModal.getByPlaceholder('5073 Mark Brown Rd').fill('100 Demo Way');
  await addModal.getByPlaceholder('W1A5AB').fill('94105');
};

test.describe('Control panel address CRUD', () => {
  test('admin can add, edit, and delete shipping and billing addresses in mock mode', async ({ page }) => {
    test.setTimeout(60_000);
    const shippingAlias = `Warehouse ${Date.now()}`;
    const billingAlias = `Billing Hub ${Date.now()}`;

    await signInAsAdmin(page);

    await page.goto('/dashboard/customers/customer-001/control-panel/shipping', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Shipping', exact: true })).toBeVisible();

    await page.locator('button.border-dashed').click();
    await fillAddAddressForm(page, shippingAlias, 'Shipping');

    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/api/user/shipping-address/customer-001') && response.request().method() === 'POST'
      ),
      page.getByRole('button', { name: 'Save', exact: true }).click(),
    ]);

    await expect(page.getByText(shippingAlias)).toBeVisible();

    await page.getByText(shippingAlias).locator('xpath=ancestor::div[contains(@class,"border-dashed")]').getByRole('button').nth(1).click();
    const editModal = page.locator('div.fixed.z-\\[60\\]').filter({ hasText: 'Edit Shipping Details' });
    await expect(editModal).toBeVisible();
    await editModal.getByPlaceholder('Address Alias 1').fill(`${shippingAlias} Updated`);

    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/api/user/shipping-address/customer-001') && response.request().method() === 'PATCH'
      ),
      editModal.getByRole('button', { name: 'Save', exact: true }).click(),
    ]);

    await expect(page.getByText(`${shippingAlias} Updated`)).toBeVisible();

    const shippingCard = page.getByText(`${shippingAlias} Updated`).locator('xpath=ancestor::div[contains(@class,"border-dashed")]');
    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/api/user/shipping-address/') && response.request().method() === 'DELETE'
      ),
      shippingCard.getByRole('button').nth(2).click(),
    ]);

    await expect(page.getByText(`${shippingAlias} Updated`)).toHaveCount(0);

    await page.goto('/dashboard/customers/customer-001/control-panel/billing', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Billing', exact: true })).toBeVisible();

    await page.locator('button.border-dashed').click();
    await fillAddAddressForm(page, billingAlias, 'Billing');

    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/api/user/billing-address/customer-001') && response.request().method() === 'POST'
      ),
      page.getByRole('button', { name: 'Save', exact: true }).click(),
    ]);

    await expect(page.getByText(billingAlias)).toBeVisible();

    await page.getByText(billingAlias).locator('xpath=ancestor::div[contains(@class,"border-dashed")]').getByRole('button').nth(1).click();
    const billingEditModal = page.locator('div.fixed.z-\\[60\\]').filter({ hasText: 'Edit Billing Details' });
    await expect(billingEditModal).toBeVisible();
    await billingEditModal.getByPlaceholder('Address Alias 1').fill(`${billingAlias} Updated`);

    await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes('/api/user/billing-address/customer-001') && response.request().method() === 'PATCH'
      ),
      billingEditModal.getByRole('button', { name: 'Save', exact: true }).click(),
    ]);

    await expect(page.getByText(`${billingAlias} Updated`)).toBeVisible();

    const billingCard = page.getByText(`${billingAlias} Updated`).locator('xpath=ancestor::div[contains(@class,"border-dashed")]');
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/user/billing-address/') && response.request().method() === 'DELETE'),
      billingCard.getByRole('button').nth(2).click(),
    ]);

    await expect(page.getByText(`${billingAlias} Updated`)).toHaveCount(0);
  });
});
