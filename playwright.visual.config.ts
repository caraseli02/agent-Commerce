import { defineConfig, devices } from '@playwright/test';

const previewPort = 3100;
const baseURL = `http://127.0.0.1:${previewPort}`;
const checkoutDatabasePath = `test-results/visual/checkout-${process.pid}.sqlite`;

/**
 * Local visual-regression pilot.
 *
 * This deliberately starts a fresh built Nitro preview for every invocation so
 * screenshots cover emitted Tailwind CSS and production component loading.
 * Do not point this configuration at `pnpm dev` or add it to CI yet.
 */
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  outputDir: 'test-results/visual',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/visual', open: 'never' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{platform}{ext}',
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      // A tiny rasterization allowance; layout, icon, and card regressions remain visible.
      maxDiffPixels: 100,
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm build && node .output/server/index.mjs',
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(previewPort),
      NUXT_PUBLIC_MOCK_MODE: 'true',
      NUXT_PUBLIC_BASE_URL_API: '/api',
      CHECKOUT_DATABASE_PATH: checkoutDatabasePath,
    },
  },
});
