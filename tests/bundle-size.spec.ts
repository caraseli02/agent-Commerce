import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT_DIR = path.join(ROOT, '.output/public/_nuxt');
const PRECOMPUTED_PATHS = [
  path.join(ROOT, '.output/server/chunks/virtual/precomputed.mjs'),
  path.join(ROOT, '.output/server/chunks/build/client.precomputed.mjs'),
];

const hasBuildOutput = existsSync(OUTPUT_DIR) && PRECOMPUTED_PATHS.some((candidate) => existsSync(candidate));

describe('bundle size guardrails', () => {
  it.skipIf(!hasBuildOutput)('keeps dashboard chart/map chunks out of storefront route graphs after build', () => {
    const output = execSync('node scripts/check-bundle-size.mjs', {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
    });

    expect(output).toContain('Bundle size check passed');
  });
});
