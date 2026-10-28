import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const productPath = '/product/stm32f407vgt6';

test('server-rendered product page includes similar products', async ({ request }) => {
  const response = await request.get(productPath);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain('Similar products');
});

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 375, height: 812 },
]) {
  test(`client navigation renders the product before similar products load at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    const failedRequests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    page.on('response', (response) => {
      if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Hold the similar-products search until the product is on screen.
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    let held = 0;
    await page.route('**/api/products/search**', async (route) => {
      held += 1;
      await released;
      await route.continue();
    });

    await page.locator(`a[href="${productPath}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${productPath}$`));
    await expect(page.getByTestId('product-purchase-panel')).toBeVisible();
    await expect.poll(() => held).toBeGreaterThan(0);
    const similarHeading = page.getByRole('heading', { name: 'Similar products', exact: true });
    await expect(similarHeading).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('product-before-similar.png') });

    release();
    await expect(similarHeading).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('product-with-similar.png'), fullPage: true });

    await writeFile(testInfo.outputPath('runtime.json'), JSON.stringify({ viewport, held, errors, failedRequests }, null, 2));
    expect(errors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}
