import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootAlias = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '~': rootAlias,
      '~~': rootAlias,
      '@': rootAlias,
      '#app': fileURLToPath(new URL('./tests/mocks/nuxt-app.ts', import.meta.url)),
      '#app/nuxt': fileURLToPath(new URL('./tests/mocks/nuxt-app.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.nuxt/**', '.output/**'],
  },
});
