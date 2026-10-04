import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Components Marketplace E2E user-flow specs.
 *
 * Specs live in tests/e2e/ and are excluded from the Vitest suite. The normal
 * `pnpm test:e2e` command starts its own built server so it inherits the
 * isolated PostgreSQL schema created by the test wrapper. Set
 * PLAYWRIGHT_BASE_URL only when deliberately testing an externally managed
 * deployment.
 */
const previewPort = 3000;
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseUrl || `http://localhost:${previewPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    // Cloud sessions can pin a preinstalled Chromium when the bundled build is unavailable.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
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
  webServer: externalBaseUrl
    ? undefined
    : {
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
        },
      },
});
