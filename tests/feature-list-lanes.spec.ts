import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

type Feature = { id: string; status: string; lane?: unknown; evidence?: string[] };

function validate(policy: Record<string, unknown>, features: Feature[]) {
  const dir = mkdtempSync(join(tmpdir(), 'feature-list-lanes-'));
  roots.push(dir);
  const path = join(dir, 'feature_list.json');
  writeFileSync(path, JSON.stringify({ schema_version: 1, policy, features }));
  const result = spawnSync('bash', ['scripts/validate-feature-list.sh'], {
    env: { ...process.env, FEATURE_LIST_PATH: path },
    encoding: 'utf8',
  });
  return { ok: result.status === 0, output: `${result.stdout}${result.stderr}` };
}

const lanes = { interactive: 1, nightly: 1 };

describe('feature list lane WIP', () => {
  it('allows one active feature per lane', () => {
    const result = validate({ wip_limit: 2, lanes, active_feature_count: 2 }, [
      { id: 'A', status: 'active' },
      { id: 'B', status: 'active', lane: 'nightly' },
    ]);
    expect(result.output).toContain('2 active');
    expect(result.ok).toBe(true);
  });

  it('rejects a second active feature in the same lane even under the total limit', () => {
    const result = validate({ wip_limit: 2, lanes }, [
      { id: 'A', status: 'active', lane: 'nightly' },
      { id: 'B', status: 'active', lane: 'nightly' },
    ]);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('lane "nightly"');
  });

  it('counts features without a lane as interactive', () => {
    const result = validate({ wip_limit: 2, lanes }, [
      { id: 'A', status: 'active' },
      { id: 'B', status: 'active', lane: 'interactive' },
    ]);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('lane "interactive"');
  });

  it('rejects undeclared lanes', () => {
    const result = validate({ wip_limit: 2, lanes }, [{ id: 'A', status: 'not_started', lane: 'weekend' }]);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('not declared in policy.lanes');
  });

  it('keeps the original single-lane behavior when lanes are absent', () => {
    expect(validate({ wip_limit: 1 }, [{ id: 'A', status: 'active' }]).ok).toBe(true);
    expect(
      validate({ wip_limit: 1 }, [
        { id: 'A', status: 'active' },
        { id: 'B', status: 'active' },
      ]).ok,
    ).toBe(false);
    expect(validate({ wip_limit: 1 }, [{ id: 'A', status: 'active', lane: 'nightly' }]).ok).toBe(false);
  });
});
