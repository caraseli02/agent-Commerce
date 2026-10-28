import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('Codex live routing safety', () => {
  it('enforces exact-head queue, independent scope, handoff and finding contracts', () => {
    const result = spawnSync(
      'python3',
      ['-m', 'unittest', 'test_router', 'test_discover', 'test_install', 'test_admission', 'test_lease_guard', 'test_recovery'],
      {
        cwd: '.codex-autonomy',
        encoding: 'utf8',
        timeout: 60_000,
      },
    );
    expect(result.status, result.stderr || String(result.error)).toBe(0);
  }, 60_000);
});
