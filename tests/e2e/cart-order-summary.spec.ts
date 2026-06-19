import { expect, test } from '@playwright/test';

/**
 * Tier 1 Critical Flow: Add to Cart → Order Summary
 *
 * Verifies the demo purchase journey can move from a product page into the
 * order summary with the selected cart item visible. This must work in mock
 * mode without forcing auth before the user can review the summary.
 */
const closeBetaDialog = async (page: import('@playwright/test').Page) => {
  const betaDialog = page.getByRole('dialog').filter({ hasText: /beta testing/i });
  await betaDialog.waitFor({ state: 'visible', timeout: 2_000 }).catch(() => undefined);
  if (await betaDialog.isVisible().catch(() => false)) {
    await betaDialog.getByRole('button', { name: /close/i }).click();
    await expect(betaDialog).toBeHidden();
  }
};

const submitCustomerSignIn = async (page: import('@playwright/test').Page) => {
  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await expect(signInButton).toBeVisible();
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);
};

const signInAsCustomer = async (page: import('@playwright/test').Page) => {
  await page.goto('/?signin=true');
  await submitCustomerSignIn(page);
  await expect(page).toHaveURL(/\/dashboard\/client\?tab=home/);
};

const expectProductInSummary = async (page: import('@playwright/test').Page) => {
  await expect(page.getByText('Professional Laptop Ultra', { exact: true }).filter({ visible: true }).first()).toBeVisible();
};

test.describe('Add to Cart → Order Summary', () => {
  test('guest user can add a product and review it in the order summary', async ({ page }) => {
    await page.goto('/product/prod-2');
    await closeBetaDialog(page);

    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/cart') && response.request().method() === 'POST'),
      page
        .getByRole('button', { name: /add to cart/i })
        .first()
        .click(),
    ]);

    await page.goto('/order-summary');

    await expect(page).toHaveURL(/\/order-summary$/);
    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    await expectProductInSummary(page);
    await expect(page.getByText(/Viewing Summary as Guest/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in to continue checkout/i })).toBeVisible();
  });

  test('guest user can sign in from the order summary and continue checkout', async ({ page }) => {
    await page.goto('/product/prod-2');
    await closeBetaDialog(page);

    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/cart') && response.request().method() === 'POST'),
      page
        .getByRole('button', { name: /add to cart/i })
        .first()
        .click(),
    ]);

    await page.goto('/order-summary');
    await expect(page.getByText(/Viewing Summary as Guest/i)).toBeVisible();

    await page.getByRole('link', { name: /sign in to continue checkout/i }).click();
    await expect(page).toHaveURL(/redirect=(%2F|\/)order-summary/);

    await submitCustomerSignIn(page);

    await expect(page).toHaveURL(/\/order-summary$/);
    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    await expectProductInSummary(page);
    await expect(page.getByText(/Viewing Summary as Guest/i)).toHaveCount(0);

    const secureCheckoutButton = page.getByRole('button', { name: /secure checkout/i });
    await expect(secureCheckoutButton).toBeEnabled();
    await Promise.all([page.waitForURL(/\/checkout\/success\?id=/), secureCheckoutButton.click()]);

    await expect(page.getByText(/payment confirmed/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible();
  });

  test('signed-in customer can complete mocked payment and see confirmation', async ({ page }) => {
    await signInAsCustomer(page);

    await page.goto('/product/prod-2');
    await closeBetaDialog(page);

    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/cart') && response.request().method() === 'POST'),
      page
        .getByRole('button', { name: /add to cart/i })
        .first()
        .click(),
    ]);

    await page.goto('/order-summary');
    await expect(page.getByRole('heading', { name: /order summary/i })).toBeVisible();
    await expectProductInSummary(page);
    await expect(page.getByText(/Viewing Summary as Guest/i)).toHaveCount(0);

    const secureCheckoutButton = page.getByRole('button', { name: /secure checkout/i });
    await expect(secureCheckoutButton).toBeEnabled();
    await Promise.all([page.waitForURL(/\/checkout\/success\?id=/), secureCheckoutButton.click()]);

    await expect(page).toHaveURL(/\/checkout\/success\?id=/);
    await expect(page.getByText(/payment confirmed/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /success/i })).toBeVisible();
    await expect(page.getByText(/order reference/i)).toBeVisible();
    await expect(page.getByText(/total paid/i)).toBeVisible();
  });
});
