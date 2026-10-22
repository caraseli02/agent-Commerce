import { expect, test, type Page } from '@playwright/test';

const NO_DATA_FILL = '#D9D9D9';

const signInAsAdmin = async (page: Page) => {
  await page.goto('/?signin=true', { waitUntil: 'networkidle' });
  await page.getByRole('radio', { name: 'Admin Preview' }).click();

  const signInButton = page.locator('button').filter({ hasText: /^\s*Sign In\s*$/ });
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/auth/login') && response.request().method() === 'POST'),
    signInButton.click(),
  ]);

  await expect(page).toHaveURL(/\/dashboard\/orders$/);
};

const hexToRgb = (hex: string) => {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
};

// Leaflet writes each country's colour as a `fill` presentation attribute; author CSS must not hide it.
const readCountryFills = (page: Page) =>
  page
    .locator('.leaflet-container path.leaflet-interactive')
    .evaluateAll((paths) => paths.map((path) => ({ attribute: path.getAttribute('fill') ?? '', computed: getComputedStyle(path).fill })));

test('customers map shows country data colours and themed no-data countries', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/dashboard/customers', { waitUntil: 'networkidle' });
  await expect(page.locator('.leaflet-container path.leaflet-interactive').first()).toBeAttached();

  const lightFills = await readCountryFills(page);
  const dataFills = lightFills.filter(({ attribute }) => attribute.toUpperCase() !== NO_DATA_FILL);
  const noDataFills = lightFills.filter(({ attribute }) => attribute.toUpperCase() === NO_DATA_FILL);

  expect(dataFills.length).toBeGreaterThan(0);
  expect(noDataFills.length).toBeGreaterThan(0);
  for (const { attribute, computed } of dataFills) {
    expect(computed).toBe(hexToRgb(attribute));
  }
  for (const { computed } of noDataFills) {
    expect(computed).toBe(hexToRgb(NO_DATA_FILL));
  }

  await page.evaluate(() => document.documentElement.classList.add('dark'));

  const darkFills = await readCountryFills(page);
  for (const { attribute, computed } of darkFills) {
    expect(computed).toBe(attribute.toUpperCase() === NO_DATA_FILL ? hexToRgb('#3a3d46') : hexToRgb(attribute));
  }
});
