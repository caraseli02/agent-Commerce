import { expect, test, type Locator, type Page } from '@playwright/test';

// Regression for #792: rows are keyed by index, so removing part 1 reuses its
// row for part 2. The reused row must show part 2's quantity, not the removed
// row's, and editing its part number must keep that quantity.

function quickBuySection(page: Page): Locator {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: 'Quick Buy', exact: true }) });
}

async function expectRemainingRowKeepsQuantity(scope: Locator) {
  const quantities = scope.getByRole('spinbutton', { name: 'Quantity', exact: true });
  await expect(quantities).toHaveCount(2);

  await scope.getByLabel('Part number 2', { exact: true }).fill('PART-TWO');
  const increase = scope.getByRole('button', { name: 'Increase quantity' }).nth(1);
  for (let step = 0; step < 4; step += 1) await increase.click();
  await expect(quantities.nth(1)).toHaveValue('5');

  await scope.getByRole('button', { name: 'Remove part 1' }).click();
  await expect(quantities).toHaveCount(1);

  const remainingPart = scope.getByLabel('Part number 1', { exact: true });
  await expect(remainingPart).toHaveValue('PART-TWO');
  await expect(quantities.first()).toHaveValue('5');

  await remainingPart.fill('PART-TWO-B');
  await expect(quantities.first()).toHaveValue('5');
}

test.describe('Quick Buy row removal', () => {
  test('desktop inline form keeps the remaining row quantity after removing a part', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const section = quickBuySection(page);
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByLabel('Part number 1', { exact: true })).toBeVisible();

    await expectRemainingRowKeepsQuantity(section.locator('form'));
  });

  test('mobile dialog keeps the remaining row quantity after removing a part', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const section = quickBuySection(page);
    await section.scrollIntoViewIfNeeded();
    const dialog = page.getByRole('dialog', { name: 'Quick buy' });
    await expect(async () => {
      await section.getByRole('button', { name: 'Add to cart' }).click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass();

    await expectRemainingRowKeepsQuantity(dialog);
  });
});
