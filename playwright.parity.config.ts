import { defineConfig, devices } from '@playwright/test';

const previewPort = 3150;
// Set PARITY_BASE_URL only to iterate against a preview you started yourself (with the test database).
const externalBaseUrl = process.env.PARITY_BASE_URL;
const baseURL = externalBaseUrl || `http://127.0.0.1:${previewPort}`;

/**
 * Migration parity harness (#632).
 *
 * Records what users and assistive technology get from a UI region — roles,
 * accessible names, states, tab order and interaction outcomes — so a
 * component swap that is allowed to change styling can prove it did not
 * change behavior. Like the visual suite it runs against a fresh built Nitro
 * preview in mock mode. Snapshots are text and platform-neutral; screenshots
 * are written to the output folder for review only and are never compared.
 */
export default defineConfig({
  testDir: './tests/parity',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  outputDir: 'test-results/parity',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/parity', open: 'never' }]],
  snapshotPathTemplate: '{testDir}/__snapshots__/{arg}{ext}',
  expect: {
    timeout: 15_000,
    // Strict structure: every ARIA snapshot must match the region's full child
    // tree in order, so an added or removed node (even one outside the tab
    // order, such as a disabled button) fails. Dynamic text stays normalised by
    // the regexes Playwright writes into the snapshot files.
    toMatchAriaSnapshot: { children: 'deep-equal' },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'pnpm build && node .output/server/index.mjs',
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: false,
        env: {
          ...process.env,
          HOST: '127.0.0.1',
          PORT: String(previewPort),
          NUXT_PUBLIC_MOCK_MODE: 'true',
          NUXT_PUBLIC_BASE_URL_API: '/api',
        },
      },
});
