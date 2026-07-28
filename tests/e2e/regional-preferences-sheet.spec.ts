import { expect, test } from '@playwright/test';

test.describe('Regional preferences sheet', () => {
  test('shows demo currency control without a misleading language selector', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const opener = page.getByRole('button', { name: 'Regional preferences' });
    const dialog = page.getByRole('dialog', { name: 'Regional Preferences' });

    await opener.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/does not include locale translation/i)).toBeVisible();
    await expect(dialog.getByText('Demo currency')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Lei' })).toBeVisible();
    await expect(dialog.getByText('Language', { exact: true })).toHaveCount(0);
  });

  test('action buttons close the sheet and allow it to reopen', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const opener = page.getByRole('button', { name: 'Regional preferences' });
    const dialog = page.getByRole('dialog');

    await opener.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    await opener.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toHaveCount(0);

    await opener.click();
    await expect(dialog).toBeVisible();
  });

  test('traps focus and supports backdrop, Escape, and mobile presentation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const opener = page.getByRole('button', { name: 'Regional preferences' });
    const dialog = page.getByRole('dialog', { name: 'Regional Preferences' });

    await opener.click();
    await expect(dialog).toBeVisible();

    const closeButton = dialog.getByRole('button', { name: 'Close regional preferences' });
    const cancelButton = dialog.getByRole('button', { name: 'Cancel' });
    await expect(closeButton).toBeFocused();
    await closeButton.press('Shift+Tab');
    await expect(cancelButton).toBeFocused();
    await cancelButton.press('Tab');
    await expect(closeButton).toBeFocused();

    const backdrop = page.locator('div.fixed.inset-0[data-state="open"]');
    await backdrop.click({ position: { x: 20, y: 400 } });
    await expect(dialog).toHaveCount(0);

    await opener.click();
    await expect(dialog).toBeVisible();
    await closeButton.press('Escape');
    await expect(dialog).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await opener.click();
    await expect(dialog).toBeVisible();
    const mobileBounds = await dialog.boundingBox();
    expect(mobileBounds?.width).toBeGreaterThanOrEqual(389);
    expect(mobileBounds?.height).toBeGreaterThanOrEqual(843);
  });
});
