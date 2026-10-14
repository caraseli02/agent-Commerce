import { readdirSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Request } from '@playwright/test';

function merchandisingChunks() {
  const directory = resolve('.output/public/_nuxt');
  const scripts = readdirSync(directory).filter((file) => file.endsWith('.js'));
  return {
    quickBuy: scripts.filter((file) => readFileSync(resolve(directory, file), 'utf8').includes('Have a part list ready?')),
    offer: scripts.filter((file) => readFileSync(resolve(directory, file), 'utf8').includes('Make a shortlist your team can trust.')),
  };
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`home merchandising defers code and preserves interactions at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    const warnings: string[] = [];
    const failures: string[] = [];
    const requested: string[] = [];
    const inFlight = new Set<Request>();
    let lastActivity = Date.now();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
      if (/hydration|mismatch/i.test(message.text())) warnings.push(message.text());
    });
    page.on('request', (request) => {
      requested.push(new URL(request.url()).pathname);
      inFlight.add(request);
      lastActivity = Date.now();
    });
    page.on('requestfinished', (request) => {
      inFlight.delete(request);
      lastActivity = Date.now();
    });
    page.on('requestfailed', (request) => {
      failures.push(`${request.url()}: ${request.failure()?.errorText}`);
      inFlight.delete(request);
      lastActivity = Date.now();
    });
    const waitForNetworkQuiet = () => expect.poll(() => inFlight.size === 0 && Date.now() - lastActivity >= 500).toBe(true);
    page.on('response', (response) => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    const chunks = merchandisingChunks();
    expect(chunks.quickBuy.length).toBeGreaterThan(0);
    expect(chunks.offer.length).toBeGreaterThan(0);
    const loaded = (names: string[]) => requested.filter((url) => names.some((name) => url.endsWith(`/${name}`)));

    const response = await page.goto('/', { waitUntil: 'networkidle' });
    const html = await response!.text();
    expect(html).toContain('Featured inventory');
    expect(html).toContain('Quick Buy');
    expect(html).toContain('Make a shortlist your team can trust.');
    await page.evaluate(() => document.fonts.ready);
    const quickBuy = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Quick Buy', exact: true }) });
    const offer = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Make a shortlist your team can trust.' }) });
    const geometry = async () =>
      Promise.all(
        [quickBuy, offer].map((section) =>
          section.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return { top: Math.round(rect.top + window.scrollY), height: Math.round(rect.height), width: Math.round(rect.width) };
          }),
        ),
      );
    const beforeGeometry = await geometry();
    expect(beforeGeometry[0]!.top).toBeGreaterThan(viewport.height + 200);
    expect(beforeGeometry[1]!.top).toBeGreaterThanOrEqual(beforeGeometry[0]!.top);
    const before = { quickBuy: loaded(chunks.quickBuy), offer: loaded(chunks.offer) };
    expect(before.quickBuy, 'offscreen Quick Buy code loaded during initial home render/prefetch').toEqual([]);
    expect(before.offer, 'offscreen offer code loaded during initial home render/prefetch').toEqual([]);

    // The hero is interactive while merchandising is still deferred.
    await page.getByRole('button', { name: 'Search catalog', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Enter a part number or keyword' })).toBeVisible();
    await expect(page.getByLabel('Search by part number or keyword')).toBeFocused();
    const beforeHydrationGeometry = await geometry();
    await page.screenshot({ path: testInfo.outputPath('home-before-scroll.png') });

    await page.evaluate((top) => window.scrollTo(0, top - window.innerHeight - 100), beforeGeometry[0]!.top);
    await expect.poll(() => loaded(chunks.quickBuy).length).toBeGreaterThan(0);
    await offer.scrollIntoViewIfNeeded();
    await expect.poll(() => loaded(chunks.offer).length).toBeGreaterThan(0);
    await page.waitForLoadState('networkidle');
    const hydratedGeometry = await geometry();
    expect(hydratedGeometry, 'hydrating merchandising changed the server-rendered section geometry').toEqual(beforeHydrationGeometry);
    await quickBuy.scrollIntoViewIfNeeded();
    if (viewport.width < 1024) {
      await quickBuy.getByRole('button', { name: 'Add to cart', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Quick buy' })).toBeVisible();
    }
    const form = viewport.width < 1024 ? page.getByRole('dialog', { name: 'Quick buy' }) : quickBuy;
    await form.getByRole('button', { name: 'Add to cart', exact: true }).click();
    await expect(form.getByText('Add at least one manufacturer part number before adding to cart.')).toBeVisible();
    await form.getByPlaceholder('Manufacturer part number').first().fill('STM32F407VGT6');
    await form.getByRole('button', { name: 'Increase quantity', exact: true }).first().click();
    await expect(form.getByRole('spinbutton', { name: 'Quantity', exact: true }).first()).toHaveValue('2');
    if (viewport.width >= 1024) {
      await form.getByRole('button', { name: 'Add part', exact: true }).click();
      await expect(form.getByLabel('Part number 3', { exact: true })).toBeVisible();
      await form.getByRole('button', { name: 'Remove part 3', exact: true }).click();
    } else {
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(quickBuy.getByRole('button', { name: 'Add to cart', exact: true })).toBeFocused();
    }
    await offer.scrollIntoViewIfNeeded();
    await expect.poll(() => loaded(chunks.offer).length).toBeGreaterThan(0);
    const link = offer.getByRole('link', { name: /Browse the catalog/ });
    await expect(link).toHaveAttribute('href', '/search');
    await page.screenshot({ path: testInfo.outputPath('merchandising-after-scroll.png') });
    const after = { quickBuy: loaded(chunks.quickBuy), offer: loaded(chunks.offer) };
    expect(after.quickBuy).toHaveLength(1);
    expect(after.offer).toHaveLength(1);
    const afterGeometry = await geometry();
    await link.click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: 'Quick Buy', exact: true }) })).toBeVisible();
    await waitForNetworkQuiet();
    await page.goto('/product/stm32f407vgt6', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Quick Buy', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Make a shortlist your team can trust.' })).toBeVisible();
    await waitForNetworkQuiet();
    await writeFile(
      testInfo.outputPath('runtime.json'),
      JSON.stringify(
        {
          viewport,
          chunks,
          before,
          after,
          beforeGeometry,
          beforeHydrationGeometry,
          hydratedGeometry,
          afterGeometry,
          errors,
          warnings,
          failures,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(failures).toEqual([]);
  });
}
