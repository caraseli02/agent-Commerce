import { execFileSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';

describe('standalone local CI service', () => {
  it('passes durable subprocess, HTTP reporting, recovery and isolation guard tests', () => {
    const result = execFileSync(process.execPath, ['--test', '--test-reporter=tap', '--test-timeout=20000', 'tests/local-ci.test.mjs'], {
      encoding: 'utf8',
      timeout: 25_000,
    });
    expect(result).toContain('# fail 0');
  }, 30_000);
});
