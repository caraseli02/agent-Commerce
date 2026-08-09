import { expect, test, type Page } from '@playwright/test';

const RUNS = 3;
const PERFORMANCE_BUDGETS = {
  fcp: 3_000,
  lcp: 3_000,
  cls: 0.1,
  interaction: 200,
} as const;

type SyntheticVitals = {
  cls: number;
  fcp: number | null;
  interaction: number | null;
  lcp: number | null;
};

type LayoutShiftEntry = PerformanceEntry & {
  hadRecentInput: boolean;
  value: number;
};

type EventTimingEntry = PerformanceEntry & {
  interactionId: number;
};

type EventTimingObserverOptions = PerformanceObserverInit & {
  durationThreshold: number;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
};

const round = (value: number) => Math.round(value * 100) / 100;

const configureMobilePerformanceProfile = async (page: Page) => {
  await page.setViewportSize({ width: 412, height: 915 });

  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 204_800,
    uploadThroughput: 96_000,
    connectionType: 'cellular3g',
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
};

const observeVitals = async (page: Page) => {
  await page.addInitScript(() => {
    const vitals = {
      fcp: null as number | null,
      lcp: null as number | null,
      cls: 0,
      interactions: [] as number[],
    };

    Object.defineProperty(window, '__ecasSyntheticVitals', {
      configurable: true,
      value: vitals,
    });

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') vitals.fcp = entry.startTime;
      }
    }).observe({ type: 'paint', buffered: true });

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) vitals.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) vitals.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as EventTimingEntry[]) {
        if (entry.interactionId) vitals.interactions.push(entry.duration);
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as EventTimingObserverOptions);
  });
};

const collectVitals = async (page: Page): Promise<SyntheticVitals> =>
  page.evaluate(() => {
    const vitals = window.__ecasSyntheticVitals;
    return {
      fcp: vitals.fcp,
      lcp: vitals.lcp,
      cls: vitals.cls,
      interaction: vitals.interactions.length > 0 ? Math.max(...vitals.interactions) : null,
    };
  });

declare global {
  interface Window {
    __ecasSyntheticVitals: {
      cls: number;
      fcp: number | null;
      interactions: number[];
      lcp: number | null;
    };
  }
}

test.describe('Synthetic mobile performance', () => {
  test.setTimeout(90_000);

  test('homepage load and cart interaction remain within performance budgets', async ({ context }) => {
    const samples: SyntheticVitals[] = [];

    for (let run = 0; run < RUNS; run += 1) {
      const page = await context.newPage();
      await observeVitals(page);
      await configureMobilePerformanceProfile(page);
      await page.goto('/', { waitUntil: 'load' });
      await page.waitForTimeout(1_000);

      await page.getByRole('button', { name: 'Open shopping cart' }).click();
      await expect(page.getByRole('heading', { name: /shopping cart/i })).toBeVisible();
      await page.waitForTimeout(100);

      samples.push(await collectVitals(page));
      await page.close();
    }

    const fcp = median(samples.map((sample) => sample.fcp).filter((value): value is number => value !== null));
    const lcp = median(samples.map((sample) => sample.lcp).filter((value): value is number => value !== null));
    const cls = median(samples.map((sample) => sample.cls));
    const interaction = median(samples.map((sample) => sample.interaction).filter((value): value is number => value !== null));

    await test.info().attach('synthetic-vitals.json', {
      body: JSON.stringify({ samples, median: { fcp, lcp, cls, interaction } }, null, 2),
      contentType: 'application/json',
    });

    console.log(
      `Synthetic mobile medians: FCP ${round(fcp)}ms, LCP ${round(lcp)}ms, CLS ${round(cls)}, interaction ${round(interaction)}ms`
    );

    expect(fcp, 'FCP exceeded the synthetic mobile budget.').toBeLessThanOrEqual(PERFORMANCE_BUDGETS.fcp);
    expect(lcp, 'LCP exceeded the synthetic mobile budget.').toBeLessThanOrEqual(PERFORMANCE_BUDGETS.lcp);
    expect(cls, 'CLS exceeded the synthetic mobile budget.').toBeLessThanOrEqual(PERFORMANCE_BUDGETS.cls);
    expect(interaction, 'Cart interaction exceeded the synthetic mobile budget.').toBeLessThanOrEqual(PERFORMANCE_BUDGETS.interaction);
  });
});
