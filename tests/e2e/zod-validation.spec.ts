import { expect, test } from '@playwright/test';

test('Zod 4 product forms retain invalid feedback and valid submissions', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/product/prod-2', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Ask about the product', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(dialog.getByText('Required', { exact: true })).toBeVisible();
  await dialog.getByPlaceholder('Enter email address').fill('buyer@example.test');
  await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Enquiry saved for this demo', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Report an error', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Describe the issue you encountered').fill('short');
  await dialog.getByRole('button', { name: 'Save demo report', exact: true }).click();
  await expect(dialog.getByText('Description must be at least 10 characters.', { exact: true })).toBeVisible();
  await dialog.screenshot({ path: testInfo.outputPath('invalid-report.png') });
  await dialog.getByPlaceholder('Describe the issue you encountered').fill('A detailed sample product issue');
  await dialog.getByRole('button', { name: 'Save demo report', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Report saved for this demo', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('account prefills remain and blank address defaults block submission', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.request.post('/api/auth/login', { data: { email: 'customer@demo.com', password: 'customer123' } });
  expect(response.ok()).toBe(true);
  const { token } = await response.json();
  await page
    .context()
    .addCookies([{ name: 'token', value: token, domain: new URL(testInfo.project.use.baseURL as string).hostname, path: '/' }]);
  await page.goto('/dashboard/client?tab=settings', { waitUntil: 'networkidle' });
  const shipping = page.locator('#Shipping');
  await expect(page.getByRole('textbox', { name: 'First Name', exact: true })).toHaveValue('Demo');
  await expect(page.getByRole('textbox', { name: 'City', exact: true })).toHaveValue('San Francisco');
  await shipping.locator('section.border-dashed button').click();
  const dialog = page.getByRole('dialog', { name: 'Add Shipping Address' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByText('City is required', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Address Alias is required', { exact: true })).toBeVisible();
  await dialog.screenshot({ path: testInfo.outputPath('invalid-address.png') });
  await dialog.getByPlaceholder('Address Alias 1').fill('Zod Migration Shipping');
  await dialog.getByRole('button', { name: 'New York' }).click();
  await page.getByRole('button', { name: 'California', exact: true }).click();
  await dialog.getByPlaceholder('Bucharest').fill('San Francisco');
  await dialog.getByPlaceholder('Address Line 1').fill('42 Migration Way');
  await dialog.getByPlaceholder('Postcode').fill('94105');
  const saved = page.waitForResponse((r) => r.url().includes('/api/user/shipping-address/') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await expect(dialog).toHaveCount(0);
  await expect(shipping.getByText('Zod Migration Shipping', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
