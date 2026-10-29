import { expect, test, type Page } from '@playwright/test';

test.setTimeout(60_000);
const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];
const signIn = async (page: Page, role: 'Customer Demo' | 'Admin Preview') => {
  await page.goto('/?signin=true', { waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: role }).click();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    page
      .locator('button')
      .filter({ hasText: /^\s*Sign In\s*$/ })
      .click(),
  ]);
  await expect(page).toHaveURL(role === 'Admin Preview' ? /\/dashboard\/orders$/ : /\/dashboard\/client\?tab=home$/);
};
const collectRuntimeErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (/hydration|mismatch/i.test(message.text())) errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.url().includes('/api/') && !response.ok()) errors.push(`${response.status()} ${response.url()}`);
  });
  return errors;
};

for (const viewport of viewports) {
  test(`${viewport.name}: public contract recent transactions displays owned known and unknown payment labels`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = collectRuntimeErrors(page);
    await signIn(page, 'Admin Preview');
    await page.goto('/dashboard/customers', { waitUntil: 'networkidle' });
    let intercepted = false;
    await page.route('**/api/dashboard/profile/customer-001/recent-transactions', async (route) => {
      intercepted = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: [
            { _id: 'known', amount: 100, status: 1 },
            { _id: 'unknown', amount: 200, status: 99 },
          ],
        }),
      });
    });
    await page.locator('a[href="/dashboard/customers/customer-001"]').first().click();
    await expect(page).toHaveURL(/\/dashboard\/customers\/customer-001$/);
    await expect(page.getByText('Customer Profile', { exact: true })).toBeVisible({ timeout: 30_000 });
    const panel = page
      .locator('div.relative')
      .filter({ has: page.getByText('Recent Transactions', { exact: true }) })
      .last();
    await expect(panel.getByText('Paid', { exact: true })).toBeVisible();
    await expect(panel.getByText('Unknown', { exact: true })).toBeVisible();
    await expect(panel.getByText('undefined', { exact: true })).toHaveCount(0);
    expect(intercepted).toBe(true);
    await panel.screenshot({ path: `/tmp/commerce-583-browser/${viewport.name}-recent-transactions.png` });
    expect(errors).toEqual([]);
  });

  test(`${viewport.name}: public contract tracking dialog never labels unknown payment state Pending`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = collectRuntimeErrors(page);
    await signIn(page, 'Customer Demo');
    const login = await page.request.post('/api/auth/login', { data: { email: 'admin@demo.com', password: 'admin123' } });
    const token = (await login.json()).data.token;
    const source = await page.request.get('/api/orders/ord-1', { headers: { authorization: `Bearer ${token}` } });
    expect(source.ok()).toBe(true);
    const payload = await source.json();
    let status: unknown = 1;
    let interceptions = 0;
    await page.route('**/api/orders/ord-1', async (route) => {
      const response = structuredClone(payload);
      response.data.order.paymentDetails.status = status;
      for (const child of response.data.children ?? []) child.paymentDetails.status = status;
      interceptions += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
    });
    for (const scenario of [
      { status: 1, label: 'Paid' },
      { status: 99, label: 'Unknown' },
      { status: '1', label: 'Unknown' },
      { status: [1], label: 'Unknown' },
      { status: null, label: 'Unknown' },
      { status: undefined, label: 'Unknown' },
    ]) {
      status = scenario.status;
      await page.goto('/order-summary/ord-1', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Track Order', exact: true }).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(scenario.label, { exact: true }).filter({ visible: true }).first()).toBeVisible();
      if (scenario.label === 'Unknown') {
        await expect(dialog.getByText('Pending', { exact: true })).toHaveCount(0);
        await expect(dialog.getByText('Paid', { exact: true })).toHaveCount(0);
        await expect(dialog.locator('.bg-green-500')).toHaveCount(0);
      }
      await dialog.screenshot({ path: `/tmp/commerce-583-browser/${viewport.name}-tracking-${scenario.label}.png` });
    }
    expect(interceptions).toBeGreaterThanOrEqual(2);
    expect(errors).toEqual([]);
  });
}
