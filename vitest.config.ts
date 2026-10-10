import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootAlias = fileURLToPath(new URL('./', import.meta.url));
const appAlias = fileURLToPath(new URL('./app/', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '~': appAlias,
      '@': appAlias,
      '~~': rootAlias,
      '@@': rootAlias,
      '#app': fileURLToPath(new URL('./tests/mocks/nuxt-app.ts', import.meta.url)),
      '#app/nuxt': fileURLToPath(new URL('./tests/mocks/nuxt-app.ts', import.meta.url)),
    },
  },
  test: {
    fileParallelism: false,
    testTimeout: 30_000,
    include: ['tests/**/*.spec.ts'],
    exclude: ['tests/e2e/**', 'tests/performance/**', 'tests/visual/**', 'node_modules/**', '.nuxt/**', '.output/**'],
    coverage: {
      provider: 'v8',
      include: ['app/composables/api/**/*.ts', 'app/store/**/*.ts'],
      reporter: ['text', 'json-summary'],
      thresholds: {
        statements: 28,
        branches: 23,
        functions: 25,
        lines: 29,
      },
    },
  },
});
