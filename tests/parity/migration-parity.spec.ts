import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  disableMotion,
  expectCleanRuntime,
  installVisualSignals,
  signInAsAdmin,
  signInAsCustomer,
  trackNetworkActivity,
  waitForVisualReady,
} from '../playwright-support/runtime';
import { scenarios } from './scenarios';
import { slug, VIEWPORT_SIZES, type ParityScenario, type ParityViewport } from './scenario';

/**
 * Before/after parity for the shadcn migration (#631, #632).
 *
 * Strict: ARIA snapshot of the region, its keyboard tab order, each step's
 * asserted outcome and a clean runtime. Informational: region screenshots in
 * the test output folder. Workflow: record snapshots on unchanged code and
 * commit them alone; migration commits must pass without touching them.
 */

const describeFocused = async (page: Page) => {
  const focused = page.locator(':focus');
  if ((await focused.count()) === 0) return null;
  const snapshot = await focused.ariaSnapshot();
  // The first line is the focused node itself; children are covered by the region snapshot.
  return snapshot.split('\n')[0].replace(/^- /, '').replace(/:$/, '').trim();
};

const isFocusInside = (region: Locator) =>
  region.evaluate((element) => element.contains(document.activeElement) && document.activeElement !== element);

/** Walks Tab from just before the region until focus leaves it, recording each stop. */
const captureTabOrder = async (page: Page, region: Locator, maxTabStops: number) => {
  await region.evaluate((element) => {
    const sentinel = document.createElement('span');
    sentinel.tabIndex = -1;
    sentinel.dataset.paritySentinel = 'true';
    element.prepend(sentinel);
    sentinel.focus();
  });

  const stops: string[] = [];
  for (let index = 0; index < maxTabStops; index += 1) {
    await page.keyboard.press('Tab');
    if (index === 0) await region.evaluate((element) => element.querySelector('[data-parity-sentinel]')?.remove());
    if (!(await isFocusInside(region))) break;
    stops.push((await describeFocused(page)) ?? '(no focus)');
  }

  if (stops.length === maxTabStops) stops.push(`… stopped after ${maxTabStops} stops`);
  return `${stops.map((stop, index) => `${index + 1}. ${stop}`).join('\n')}\n`;
};

const prepare = async (page: Page, scenario: ParityScenario) => {
  if (scenario.role === 'admin') await signInAsAdmin(page);
  if (scenario.role === 'customer') await signInAsCustomer(page);

  const signals = installVisualSignals(page);
  const network = trackNetworkActivity(page);
  await page.goto(scenario.route, { waitUntil: 'domcontentloaded' });
  await waitForVisualReady(page, scenario.route);
  await network.waitForQuiet(scenario.route);
  await scenario.setup?.(page);
  return signals;
};

const runScenario = async (page: Page, scenario: ParityScenario, viewport: ParityViewport) => {
  const base = `${scenario.slice.toLowerCase()}--${scenario.id}--${viewport}`;
  const signals = await prepare(page, scenario);

  const region = scenario.region(page);
  await expect(region, `region for ${base}`).toBeVisible();
  await region.scrollIntoViewIfNeeded();

  await test.info().attach(`${base}.png`, { body: await region.screenshot(), contentType: 'image/png' });
  await expect(region).toMatchAriaSnapshot({ name: `${base}.aria.yml` });
  expect(await captureTabOrder(page, region, scenario.maxTabStops ?? 40)).toMatchSnapshot(`${base}--tab-order.txt`);

  for (const step of scenario.steps ?? []) {
    await test.step(step.name, async () => {
      await step.act(page, region);
      await step.verify(page, region);
      if (step.snapshot) {
        const after = step.snapshot(page);
        await expect(after).toBeVisible();
        await test.info().attach(`${base}--${slug(step.name)}.png`, { body: await after.screenshot(), contentType: 'image/png' });
        await expect(after).toMatchAriaSnapshot({ name: `${base}--${slug(step.name)}.aria.yml` });
      }
    });
  }

  expectCleanRuntime(signals, scenario.route);
};

test.beforeEach(async ({ page }) => {
  await disableMotion(page);
});

for (const scenario of scenarios) {
  for (const viewport of scenario.viewports) {
    test(`[${scenario.slice}] ${scenario.id} (${viewport})`, async ({ page }) => {
      await page.setViewportSize(VIEWPORT_SIZES[viewport]);
      await runScenario(page, scenario, viewport);
    });
  }
}

test('scenario ids are unique', () => {
  const ids = scenarios.map((scenario) => scenario.id);
  expect(new Set(ids).size).toBe(ids.length);
});
