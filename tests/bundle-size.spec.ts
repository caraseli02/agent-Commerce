import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT_DIR = path.join(ROOT, '.output/public/_nuxt');
const PRECOMPUTED_PATH = path.join(ROOT, '.output/server/chunks/build/client.precomputed.mjs');

function ensureBuildOutput() {
  if (!existsSync(OUTPUT_DIR) || !existsSync(PRECOMPUTED_PATH)) {
    execSync('pnpm build', {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS: 'false',
      },
    });
  }
}

describe('bundle size guardrails', () => {
  it('keeps dashboard chart/map chunks out of storefront route graphs after build', () => {
    ensureBuildOutput();

    const output = execSync('node scripts/check-bundle-size.mjs', {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
    });

    expect(output).toContain('Bundle size check passed');
  });
});
