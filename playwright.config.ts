import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ECAS E2E user-flow specs.
 *
 * Specs live in tests/e2e/ and are excluded from the Vitest suite.
 * The dev server must be running (pnpm dev) — these are real-browser
 * flow specs against the actual rendered app.
 */
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
        baseURL: 'http://localhost:3000',
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
});
