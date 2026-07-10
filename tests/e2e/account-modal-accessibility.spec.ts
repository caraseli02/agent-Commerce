import { expect, test } from '@playwright/test';

test.describe('Account modal accessibility', () => {
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
