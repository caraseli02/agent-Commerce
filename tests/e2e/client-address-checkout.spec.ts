import { expect, test, type Locator, type Page } from '@playwright/test';

test.setTimeout(60_000);

const submitCustomerSignIn = async (page: Page) => {
  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
};

const addAddress = async (page: Page, section: Locator, kind: 'Shipping' | 'Billing', alias: string, line1: string) => {
  await section.locator('section.border-dashed button').click();
  const dialog = page.getByRole('dialog', { name: `Add ${kind} Address` });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('Address Alias 1').fill(alias);
  await dialog.getByRole('button', { name: 'New York' }).click();
  await page.getByRole('button', { name: 'California', exact: true }).click();
  await dialog.getByPlaceholder('Bucharest').fill('San Francisco');
  await dialog.getByPlaceholder('Address Line 1').fill(line1);
  await dialog.getByPlaceholder('Postcode').fill('94105');

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes(`/api/user/${kind.toLowerCase()}-address/`) && response.request().method() === 'POST',
    ),
    dialog.getByRole('button', { name: 'Save', exact: true }).click(),
  ]);
  await expect(section.getByText(alias, { exact: true })).toBeVisible();

  const card = section.getByText(alias, { exact: true }).locator('xpath=ancestor::article');
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes(`/api/user/${kind.toLowerCase()}-address/`) && response.request().method() === 'PATCH',
    ),
    card.getByRole('button').first().click(),
  ]);
  await expect(card.getByText('Default', { exact: true }).filter({ visible: true }).first()).toBeVisible();
};

test('customer-created default addresses enable signed-in checkout', async ({ page }) => {
  await page.goto('/product/prod-2', { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: /add to cart/i })
    .first()
    .click();
  await page.goto('/order-summary', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /sign in to continue checkout/i }).click();
  await submitCustomerSignIn(page);
  await expect(page).toHaveURL(/\/order-summary$/);

  await page.goto('/dashboard/client?tab=settings', { waitUntil: 'networkidle' });
  const shippingSection = page.locator('#Shipping');
  const billingSection = page.locator('#Billing');
  await expect(shippingSection.getByRole('heading', { name: 'Shipping', exact: true })).toBeVisible();
  await expect(billingSection.getByRole('heading', { name: 'Billing', exact: true })).toBeVisible();
  await expect(page.getByText('No results.', { exact: true })).toHaveCount(0);

  await addAddress(page, shippingSection, 'Shipping', 'Checkout Shipping', '42 Checkout Way');
  await addAddress(page, billingSection, 'Billing', 'Checkout Billing', '84 Billing Way');

  await page.goto('/order-summary', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /shipping and billing/i }).click();
  await expect(page.getByText('Checkout Shipping', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /secure checkout/i })).toBeEnabled();
});
