import { expect, test } from '@playwright/test';

test.describe('Ask about product validation', () => {
  test('empty email submit shows invalid styling and accessible error text', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/product/prod-1', { waitUntil: 'networkidle' });

    await page.getByRole('button', { name: /ask about the product/i }).click();
    const emailInput = page.getByRole('dialog').getByPlaceholder('Enter email address');
    await expect(emailInput).toBeVisible();

    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();

    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Email is required');

    const borderColor = await emailInput.evaluate((element) => getComputedStyle(element).borderTopColor);
    expect(borderColor).toBe('rgb(250, 75, 75)');

    await emailInput.fill('buyer@example.com');
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
    await expect(emailInput).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveCount(0);
  });
});
