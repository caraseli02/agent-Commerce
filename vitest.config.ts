import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootAlias = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '~': rootAlias,
      '~~': rootAlias,
      '#app': fileURLToPath(new URL('./tests/mocks/nuxt-app.ts', import.meta.url)),
      '#app/nuxt': fileURLToPath(new URL('./tests/mocks/nuxt-app.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    exclude: ['tests/e2e/**', 'tests/performance/**', 'node_modules/**', '.nuxt/**', '.output/**'],
    coverage: {
      provider: 'v8',
      include: ['composables/api/**/*.ts', 'store/**/*.ts'],
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
