import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Nuxt 4 reads application sources from `app/`. These names at the repository root
// mean someone reintroduced the Nuxt 3 layout (#530, #531). See CONTEXT.md § Directory layout.
const LEGACY_APP_SOURCES = [
  'pages',
  'components',
  'composables',
  'layouts',
  'middleware',
  'plugins',
  'utils',
  'assets',
  'store',
  'app.vue',
  'error.vue',
  'app.config.ts',
] as const;

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const findLegacyAppSources = (rootEntries: readonly string[]) => LEGACY_APP_SOURCES.filter((name) => rootEntries.includes(name));

const describeViolations = (violations: readonly string[]) =>
  violations.map((name) => `${name} is a Nuxt application source at the repo root; move it to app/${name} (Nuxt 4 srcDir).`);

describe('Nuxt 4 directory contract', () => {
  it('flags every legacy root-level application source', () => {
    expect(findLegacyAppSources([...LEGACY_APP_SOURCES])).toEqual([...LEGACY_APP_SOURCES]);
    expect(describeViolations(['pages'])).toEqual([
      'pages is a Nuxt application source at the repo root; move it to app/pages (Nuxt 4 srcDir).',
    ]);
  });

  it('permits the Nuxt 4 root concerns', () => {
    const allowed = [
      'app',
      'server',
      'shared',
      'public',
      'modules',
      'layers',
      'content',
      'types',
      'helpers',
      'model',
      'data',
      'tests',
      'scripts',
      'docs',
      'nuxt.config.ts',
      'package.json',
      'README.md',
    ];

    expect(findLegacyAppSources(allowed)).toEqual([]);
  });

  it('keeps application sources out of the repository root', () => {
    expect(describeViolations(findLegacyAppSources(readdirSync(repoRoot)))).toEqual([]);
  });

  it('keeps app/ as the Nuxt source directory', () => {
    expect(readdirSync(new URL('../app/', import.meta.url))).toContain('app.vue');
    expect(readFileSync(new URL('../nuxt.config.ts', import.meta.url), 'utf8')).not.toMatch(/\bsrcDir\b/);
  });
});
