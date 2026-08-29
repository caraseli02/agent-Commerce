import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OUTPUT_DIR, PRECOMPUTED_PATH } from '../scripts/bundle-size-paths.mjs';

const hasBuildOutput = existsSync(OUTPUT_DIR) && existsSync(PRECOMPUTED_PATH);

describe('bundle size guardrails', () => {
  it.skipIf(!hasBuildOutput)('keeps dashboard chart/map chunks out of storefront route graphs after build', () => {
    const output = execSync('node scripts/check-bundle-size.mjs', {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
      env: process.env,
    });

    expect(output).toContain('Bundle size check passed');
  });
});
