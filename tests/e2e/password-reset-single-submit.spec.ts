import { expect, test, type Page } from '@playwright/test';

// #636: each password form must send exactly one request per click and per Enter.
const countRequests = async (page: Page, path: string) => {
  const calls: string[] = [];

  await page.route(`**/api/user/password/${path}`, async (route) => {
    calls.push(route.request().method());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
  });

  return calls;
};

test.describe('forgot password', () => {
  for (const trigger of ['click', 'enter'] as const) {
    test(`sends one reset-link request per ${trigger}`, async ({ page }) => {
      const calls = await countRequests(page, 'email/reset');
      await page.goto('/forgot-password');

      const email = page.getByPlaceholder('Enter Your Email Address');
      await email.fill('buyer@demo.com');

      if (trigger === 'click') {
        await page.getByRole('button', { name: 'Reset Password' }).click();
      } else {
        await email.press('Enter');
      }

      await expect(page).toHaveURL(/\/$/);
      expect(calls).toEqual(['POST']);
    });
  }
});

test.describe('password reset', () => {
  const fillForm = async (page: Page, repeatPassword: string) => {
    await page.getByPlaceholder('Enter Your Email Address').fill('buyer@demo.com');
    await page.getByPlaceholder('New Password').fill('new-password-1');
    await page.getByPlaceholder('Repeat Password').fill(repeatPassword);
  };

  for (const trigger of ['click', 'enter'] as const) {
    test(`sends one reset request per ${trigger}`, async ({ page }) => {
      const calls = await countRequests(page, 'reset');
      await page.goto('/password-reset?oobCode=demo-code');
      await fillForm(page, 'new-password-1');

      if (trigger === 'click') {
        await page.getByRole('button', { name: 'Save Password' }).click();
      } else {
        await page.getByPlaceholder('Repeat Password').press('Enter');
      }

      await expect(page).toHaveURL(/\/$/);
      expect(calls).toEqual(['POST']);
    });
  }

  test('blocks the request when the repeated password differs', async ({ page }) => {
    const calls = await countRequests(page, 'reset');
    await page.goto('/password-reset?oobCode=demo-code');
    await fillForm(page, 'something-else');

    await page.getByRole('button', { name: 'Save Password' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
    await expect(page).toHaveURL(/\/password-reset/);
    expect(calls).toEqual([]);
  });
});
