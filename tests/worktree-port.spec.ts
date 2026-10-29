import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { PORT_OFFSETS, portBase, testPort } from '../scripts/worktree-port.mjs';

describe('per-checkout test server ports', () => {
  const routine = '/Users/work/Documents/agent-Commerce/.claude/worktrees/routine-run/';
  const interactive = '/Users/work/Documents/agent-Commerce/.claude/worktrees/interactive/';

  it('derives a stable block per checkout, apart from the fixed dev and night-lane ports', () => {
    expect(portBase(routine, {})).toBe(portBase(routine, {}));
    expect(portBase(routine, {})).not.toBe(portBase(interactive, {}));
    for (const checkout of [routine, interactive, '/tmp/x/']) {
      const base = portBase(checkout, {});
      expect(base % 10).toBe(0);
      expect(base).toBeGreaterThanOrEqual(40_000);
      expect(base + 9).toBeLessThan(49_152);
    }
  });

  it('gives each server its own offset and lets TEST_PORT_BASE pin the block', () => {
    expect(new Set(Object.values(PORT_OFFSETS)).size).toBe(Object.keys(PORT_OFFSETS).length);
    expect(testPort('e2e', routine, { TEST_PORT_BASE: '3000' })).toBe(3000);
    expect(testPort('visual', routine, { TEST_PORT_BASE: '3000' })).toBe(3001);
    expect(testPort('smoke', routine, {})).toBe(portBase(routine, {}) + PORT_OFFSETS.smoke);
    expect(() => portBase(routine, { TEST_PORT_BASE: '80' })).toThrow(/TEST_PORT_BASE/);
    expect(() => portBase(routine, { TEST_PORT_BASE: 'abc' })).toThrow(/TEST_PORT_BASE/);
    expect(() => testPort('dev', routine, {})).toThrow(/Unknown test server/);
  });

  it("prints the working checkout's ports", () => {
    const printed = spawnSync(process.execPath, ['scripts/worktree-port.mjs'], { encoding: 'utf8', env: { PATH: process.env.PATH } });
    expect(printed.status).toBe(0);
    expect(printed.stdout).toContain(`e2e=${testPort('e2e', process.cwd(), {})}\nvisual=${testPort('visual', process.cwd(), {})}\n`);
  });
});
