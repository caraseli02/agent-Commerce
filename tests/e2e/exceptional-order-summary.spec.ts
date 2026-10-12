import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  for (const scenario of ['backorder', 'small-order'] as const) {
    test(`${scenario} review at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      const warnings: string[] = [];
      const failedRequests: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
        if (message.type() === 'warning') warnings.push(message.text());
      });
      page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}`));
      page.on('response', (response) => {
        if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
      });

      // Existing public fixtures, real cart and quote routes; no intercepted prices or production provider.
      const productId = scenario === 'backorder' ? 'prod-1' : 'prod-11';
      const response = await page.request.post('/api/cart', {
        data: {
          products: [
            { id: productId, stock: scenario === 'backorder' ? 0 : 1, backorder_stock: scenario === 'backorder' ? 1 : 0, isFolder: false },
          ],
        },
      });
      expect(response.ok()).toBe(true);
      await page.goto('/order-summary', { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { name: 'Order Summary', exact: true })).toBeVisible();
      const summary = page.getByText('Payment Summary', { exact: true }).locator('../..');

      if (scenario === 'backorder') {
        await expect(page.getByText('There are Back Order items in your cart.', { exact: false })).toBeVisible();
        await expect(page.getByText('Backorder Items: 1', { exact: true })).toBeVisible();
        await page.getByTestId('checkout-as-guest').click();
        const expand = page.getByRole('button', { name: 'Shipping Preferences', exact: true });
        if (!(await page.getByRole('button', { name: /Backorder Standard/ }).isVisible())) await expand.click();
        const preference = page.getByRole('button', { name: /Backorder Standard/ });
        await preference.click();
        await expect(preference).toHaveAttribute('aria-pressed', 'true');
        await expect
          .poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('checkout-draft-v1') || '{}').backorderOption?._id))
          .toBe('back-001');
        await page.reload({ waitUntil: 'networkidle' });
        if (!(await preference.isVisible())) await expand.click();
        await expect(preference).toHaveAttribute('aria-pressed', 'true');
        await expect(summary.getByText('Handling Charge', { exact: true })).toHaveCount(0);
      } else {
        await expect(summary.getByText('Handling Charge', { exact: true })).toBeVisible();
        await expect(summary.getByText('4.99 Lei', { exact: true })).toBeVisible();
        await expect(summary.getByText('48.68 Lei', { exact: true })).toBeVisible();
        await expect(page.getByText('There are Back Order items in your cart.', { exact: false })).toHaveCount(0);
        const trigger = page.getByRole('button', { name: 'Explain small order handling charge', exact: true });
        await trigger.focus();
        await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('heading', { name: 'Small Order Handling Charge', exact: true })).toBeVisible();
        await expect(dialog.getByText(/below 50.00 Lei excluding VAT/)).toBeVisible();
        await expect(dialog.getByText(/4.99 Lei handling charge/)).toBeVisible();
        await expect(dialog.getByText(/Delivery is charged separately/)).toBeVisible();
        await expect(dialog.getByText(/\$/)).toHaveCount(0);
        const modalPath = testInfo.outputPath('handling-dialog.png');
        await page.screenshot({ path: modalPath });
        await testInfo.attach('handling-dialog.png', { path: modalPath, contentType: 'image/png' });
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
      }
      const screenshot = testInfo.outputPath(`${scenario}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      await testInfo.attach(`${scenario}.png`, { path: screenshot, contentType: 'image/png' });
      const runtime = testInfo.outputPath('runtime.json');
      await writeFile(runtime, JSON.stringify({ route: '/order-summary', viewport, scenario, errors, warnings, failedRequests }, null, 2));
      await testInfo.attach('runtime.json', { path: runtime, contentType: 'application/json' });
      expect(errors).toEqual([]);
      expect(warnings.filter((warning) => /hydration/i.test(warning))).toEqual([]);
      expect(failedRequests).toEqual([]);
    });
  }
}
