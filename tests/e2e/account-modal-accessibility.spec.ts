import { expect, test } from '@playwright/test';

test.describe('Account modal accessibility', () => {
  for (const width of [1440, 390]) {
    for (const entry of ['header', 'signin-query']) {
      test(`signup link navigates and closes the ${entry} panel at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(entry === 'header' ? '/' : '/?signin=true&redirect=%2Forder-summary', { waitUntil: 'networkidle' });
        if (entry === 'header') await page.getByRole('button', { name: 'Open my account' }).click();

        const dialog = page.getByRole('dialog', { name: 'Sign in' });
        const signup = dialog.getByRole('link', { name: 'Create an account' });
        await expect(signup).toHaveAttribute('href', '/signup');
        await signup.focus();
        await expect(signup).toBeFocused();
        await page.keyboard.press('Enter');

        await expect(page).toHaveURL(/\/signup$/);
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Create your account', exact: true })).toBeVisible();
      });
    }
  }

  test('traps focus, supports role keyboard navigation, and restores the opener', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const accountButton = page.getByRole('button', { name: 'Open my account' });
    await expect(accountButton).toBeVisible();
    await accountButton.click();

    const dialog = page.getByRole('dialog', { name: 'Sign in' });
    await expect(dialog).toBeVisible();

    const closeButton = dialog.getByRole('button', { name: 'Close account panel' });
    const supportLink = dialog.getByRole('link', { name: 'support@demo.app' });
    await expect(closeButton).toBeFocused();

    await closeButton.press('Shift+Tab');
    await expect(supportLink).toBeFocused();
    await supportLink.press('Tab');
    await expect(closeButton).toBeFocused();

    const customerRole = dialog.getByRole('radio', { name: 'Customer Demo' });
    const adminRole = dialog.getByRole('radio', { name: 'Admin Preview' });
    await expect(customerRole).toHaveAttribute('aria-checked', 'true');

    await customerRole.press('ArrowRight');
    await expect(adminRole).toHaveAttribute('aria-checked', 'true');
    await expect(adminRole).toBeFocused();

    await adminRole.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(accountButton).toBeFocused();
  });
});
