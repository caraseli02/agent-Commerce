import { expect, test, type Locator, type Page } from '@playwright/test';

// Regression for #700: the inline (desktop) Quick Buy rows stay in the DOM on
// mobile, so the dialog rows must not reuse their IDs or the dialog labels
// would target hidden inputs.

function quickBuySection(page: Page): Locator {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: 'Quick Buy', exact: true }) });
}

async function duplicateIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    document.querySelectorAll('[id]').forEach((element) => {
      if (seen.has(element.id)) duplicates.add(element.id);
      seen.add(element.id);
    });
    return [...duplicates];
  });
}

async function expectLabelActivatesInput(scope: Locator, name: string) {
  const input = scope.getByLabel(name, { exact: true });
  await expect(input).toBeVisible();
  const labelFor = await input.evaluate((element) => element.id);
  await scope.locator(`label[for="${labelFor}"]`).evaluate((label: HTMLLabelElement) => label.click());
  await expect(input).toBeFocused();
}

test.describe('Quick Buy input IDs', () => {
  test('mobile dialog labels target the visible dialog inputs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const section = quickBuySection(page);
    await section.scrollIntoViewIfNeeded();
    const dialog = page.getByRole('dialog', { name: 'Quick buy' });
    await expect(async () => {
      await section.getByRole('button', { name: 'Add to cart' }).click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass();

    expect(await duplicateIds(page)).toEqual([]);

    await expectLabelActivatesInput(dialog, 'Part number 1');
    await expectLabelActivatesInput(dialog, 'Part number 2');

    const firstPart = dialog.getByLabel('Part number 1', { exact: true });
    await dialog.getByRole('button', { name: 'Add to cart' }).click();
    await expect(firstPart).toHaveAccessibleDescription('Add a part number or remove this row.');
    expect(await duplicateIds(page)).toEqual([]);

    await firstPart.fill('ABC-123');
    await expect(firstPart).toHaveValue('ABC-123');

    await dialog.getByRole('button', { name: 'Remove part 2' }).click();
    await expect(dialog.getByLabel('Part number 2', { exact: true })).toHaveCount(0);
    await expect(firstPart).toHaveValue('ABC-123');
    expect(await duplicateIds(page)).toEqual([]);
  });

  test('desktop inline labels target the inline inputs', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const section = quickBuySection(page);
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByLabel('Part number 1', { exact: true })).toBeVisible();

    expect(await duplicateIds(page)).toEqual([]);

    await expectLabelActivatesInput(section, 'Part number 1');
    await expectLabelActivatesInput(section, 'Part number 2');
  });
});
