import { expect, test } from '@playwright/test';

// Regression for #790: after an empty submit, the alert and aria-invalid must clear
// as soon as the shopper types a term, so the field never reads as invalid while valid.

const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

for (const viewport of viewports) {
  test(`hero search error clears once a term is typed (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/', { waitUntil: 'networkidle' });

    const form = page.locator('form').filter({ has: page.getByRole('searchbox', { name: 'Search by part number or keyword' }) });
    const searchbox = form.getByRole('searchbox', { name: 'Search by part number or keyword' });

    await form.getByRole('button', { name: 'Search catalog' }).click();
    await expect(form.getByRole('alert')).toHaveText('Enter a part number or keyword to search.');
    await expect(searchbox).toHaveAttribute('aria-invalid', 'true');

    await searchbox.pressSequentially('STM32');
    await expect(form.getByRole('alert')).toHaveCount(0);
    await expect(searchbox).not.toHaveAttribute('aria-invalid', 'true');

    // Clearing the field again does not re-show the error until the next submit.
    await searchbox.fill('');
    await expect(form.getByRole('alert')).toHaveCount(0);
    await form.getByRole('button', { name: 'Search catalog' }).click();
    await expect(form.getByRole('alert')).toHaveText('Enter a part number or keyword to search.');
    await expect(searchbox).toBeFocused();
  });
}
