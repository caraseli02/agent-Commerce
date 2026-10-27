import { readdirSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

// Inspect the emitted code, so a lazy-looking template with eager shared imports
// still fails this regression. File hashes change on every build.
function zoomChunks() {
  const directory = resolve('.output/public/_nuxt');
  return readdirSync(directory).filter((file) => {
    if (!file.endsWith('.js')) return false;
    const source = readFileSync(resolve(directory, file), 'utf8');
    return source.includes('imageContainer') || source.includes('currentZoom') || source.includes('product thumbnail');
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`zoom code loads on request and preserves gallery interaction at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    const warnings: string[] = [];
    const failedRequests: string[] = [];
    const requested: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
      if (message.type() === 'warning') warnings.push(message.text());
    });
    page.on('request', (request) => requested.push(new URL(request.url()).pathname));
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    page.on('response', (response) => {
      if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
    });

    const chunks = zoomChunks();
    expect(chunks.length).toBeGreaterThan(0);
    await page.goto('/product/stm32f407vgt6', { waitUntil: 'networkidle' });
    const opener = page.getByRole('button', { name: 'Open product image gallery', exact: true });
    await expect(opener).toBeVisible();
    const before = requested.filter((url) => chunks.some((chunk) => url.endsWith(`/${chunk}`)));
    expect(before).toEqual([]);
    await opener.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.imageContainer img')).toBeVisible();
    const after = requested.filter((url) => chunks.some((chunk) => url.endsWith(`/${chunk}`)));
    expect(after.length).toBeGreaterThan(0);
    await dialog.locator('.imageContainer').hover();
    await page.mouse.wheel(0, -300);
    await expect(dialog.locator('.imageContainer img')).toHaveAttribute('style', /scale\(1\.[0-9]+\)/);
    await page.screenshot({ path: testInfo.outputPath('zoom-open.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);

    // The public demo products have one image. Extend only this browser response
    // with a second existing sample image to exercise selection/remount behavior.
    await page.route('**/api/products/stm32f407vgt6', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.data.details.ProductImage = [
        body.data.details.ProductImage,
        {
          ProductImageSmall: '/images/products/headphones.webp',
          ProductImageLarge: '/images/products/headphones.webp',
        },
      ];
      await route.fulfill({ response, json: body });
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('a[href="/product/stm32f407vgt6"]').first().click();
    await expect(page.getByRole('button', { name: 'Show product image 2', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Show product image 2', exact: true }).click();
    await opener.click();
    await expect(dialog).toBeVisible();
    const mainCarousel = dialog.getByRole('region').first();
    const selectedImage = dialog.locator('.imageContainer img').nth(1);
    await expect(selectedImage).toBeInViewport({ ratio: 0.9 });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Show product image 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await opener.click();
    await expect(selectedImage).toBeInViewport({ ratio: 0.9 });
    // Dialog thumbnails are buttons: keyboard selection moves the main carousel.
    const dialogThumb1 = dialog.getByRole('button', { name: 'Show product image 1', exact: true });
    const dialogThumb2 = dialog.getByRole('button', { name: 'Show product image 2', exact: true });
    await expect(dialogThumb2).toHaveAttribute('aria-pressed', 'true');
    await dialogThumb1.focus();
    await page.keyboard.press('Space');
    await expect(dialogThumb1).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.locator('.imageContainer img').first()).toBeInViewport({ ratio: 0.9 });
    await dialogThumb2.focus();
    await page.keyboard.press('Enter');
    await expect(dialogThumb2).toHaveAttribute('aria-pressed', 'true');
    await expect(selectedImage).toBeInViewport({ ratio: 0.9 });
    await mainCarousel.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(mainCarousel.getByRole('button', { name: 'Previous Slide', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Show product image 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: testInfo.outputPath('gallery-closed.png') });

    // Browser back changes the product route without reloading the application.
    await opener.click();
    await expect(dialog).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(dialog).toHaveCount(0);
    await page.locator('a[href="/product/stm32f407vgt6"]').first().click();
    await expect(opener).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Show product image 1', exact: true })).toHaveAttribute('aria-pressed', 'true');

    await writeFile(
      testInfo.outputPath('runtime.json'),
      JSON.stringify({ viewport, chunks, before, after, errors, warnings, failedRequests }, null, 2),
    );
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}
