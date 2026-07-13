import { describe, expect, it } from 'vitest';

import { parseAndValidateLedger, summarizeRuns } from '../scripts/loop-accountability.mjs';

function validRun(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: 1,
    run_id: 'run-332-001',
    agent: {
      id: 'codex-generator-01',
      role: 'generator',
    },
    work: {
      issue: 332,
      branch: 'codex/issue-332-loop-accountability',
      head_sha: 'a'.repeat(40),
    },
    permissions: {
      read_paths: ['docs/agents/', 'scripts/', 'tests/'],
      write_paths: ['scripts/loop-accountability.mjs', 'tests/loop-accountability.spec.ts'],
      denied_paths: ['.env', '.github/workflows/'],
      commands: ['pnpm exec vitest*', 'pnpm verify'],
      denied_commands: ['git push*'],
    },
    budgets: {
      max_iterations: 4,
      max_tokens: 50_000,
      max_cost_usd: 10,
    },
    usage: {
      iterations: 2,
      tokens: 12_000,
      cost_usd: 1.25,
    },
    actions: [
      {
        sequence: 1,
        at: '2026-07-13T20:00:00.000Z',
        kind: 'file',
        access: 'write',
        target: 'tests/loop-accountability.spec.ts',
      },
      {
        sequence: 2,
        at: '2026-07-13T20:01:00.000Z',
        kind: 'command',
        command: 'pnpm exec vitest run tests/loop-accountability.spec.ts',
        exit_code: 0,
      },
    ],
    stop: {
      reason: 'accepted',
      at: '2026-07-13T20:02:00.000Z',
    },
    evaluation: {
      agent_id: 'codex-evaluator-02',
      head_sha: 'a'.repeat(40),
      verdict: 'PASS',
      at: '2026-07-13T20:03:00.000Z',
    },
    outcome: {
      accepted_change: 'PR #333',
    },
    ...overrides,
  };
}

function asJsonl(...runs: unknown[]) {
  return runs.map((run) => JSON.stringify(run)).join('\n');
}

describe('loop accountability ledger', () => {
  it('accepts an attributable, authorized, budgeted, independently evaluated run', () => {
    const runs = parseAndValidateLedger(asJsonl(validRun()));

    expect(runs).toHaveLength(1);
    expect(runs[0]?.run_id).toBe('run-332-001');
  });

  it('reports the run and line when a touched path is outside declared permissions', () => {
    const run = validRun({
      actions: [
        {
          sequence: 1,
          at: '2026-07-13T20:00:00.000Z',
          kind: 'file',
          access: 'write',
          target: 'server/api/admin-secret.ts',
        },
      ],
    });

    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(
      'line 1, run run-332-001: write target "server/api/admin-secret.ts" is outside permissions.write_paths'
    );
  });

  it('rejects denied paths and commands even when a broader allow rule matches', () => {
    const run = validRun({
      permissions: {
        read_paths: ['.'],
        write_paths: ['.'],
        denied_paths: ['.env'],
        commands: ['git*'],
        denied_commands: ['git push*'],
      },
      actions: [
        {
          sequence: 1,
          at: '2026-07-13T20:00:00.000Z',
          kind: 'file',
          access: 'read',
          target: '.env',
        },
        {
          sequence: 2,
          at: '2026-07-13T20:01:00.000Z',
          kind: 'command',
          command: 'git push origin main',
          exit_code: 0,
        },
      ],
    });

    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/read target ".env" matches permissions\.denied_paths/);
    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/command "git push origin main" matches permissions\.denied_commands/);
  });

  it('rejects non-canonical path aliases instead of letting them bypass a denial', () => {
    const run = validRun({
      permissions: {
        read_paths: ['.'],
        write_paths: ['.'],
        denied_paths: ['.env'],
        commands: [],
        denied_commands: [],
      },
      actions: [
        {
          sequence: 1,
          at: '2026-07-13T20:00:00.000Z',
          kind: 'file',
          access: 'read',
          target: './.env',
        },
      ],
    });

    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError('actions[0].target must be a safe repo-relative path');
  });

  it('rejects out-of-order actions and usage beyond any declared budget', () => {
    const run = validRun({
      usage: {
        iterations: 5,
        tokens: 50_001,
        cost_usd: 10.01,
      },
      actions: [
        {
          sequence: 2,
          at: '2026-07-13T20:01:00.000Z',
          kind: 'command',
          command: 'pnpm verify',
          exit_code: 0,
        },
        {
          sequence: 1,
          at: '2026-07-13T20:00:00.000Z',
          kind: 'command',
          command: 'pnpm verify',
          exit_code: 0,
        },
      ],
    });

    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/usage\.iterations 5 exceeds budgets\.max_iterations 4/);
    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/usage\.tokens 50001 exceeds budgets\.max_tokens 50000/);
    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/usage\.cost_usd 10\.01 exceeds budgets\.max_cost_usd 10/);
    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/actions\[0\]\.sequence must be 1/);
  });

  it('rejects self-evaluation, a mismatched evaluated head, and PASS without an accepted change', () => {
    const run = validRun({
      evaluation: {
        agent_id: 'codex-generator-01',
        head_sha: 'b'.repeat(40),
        verdict: 'PASS',
        at: '2026-07-13T20:03:00.000Z',
      },
      outcome: {
        accepted_change: null,
      },
    });

    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/evaluation\.agent_id must differ from agent\.id/);
    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/evaluation\.head_sha must match work\.head_sha/);
    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/PASS requires outcome\.accepted_change/);
  });

  it('requires actions, stop, and independent evaluation to follow chronological outcome order', () => {
    const run = validRun({
      stop: {
        reason: 'rejected',
        at: '2026-07-13T19:59:00.000Z',
      },
      evaluation: {
        agent_id: 'codex-evaluator-02',
        head_sha: 'a'.repeat(40),
        verdict: 'PASS',
        at: '2026-07-13T19:58:00.000Z',
      },
    });

    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/stop\.at must not be earlier than the last action/);
    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/evaluation\.at must not be earlier than stop\.at/);
    expect(() => parseAndValidateLedger(asJsonl(run))).toThrowError(/PASS requires stop\.reason accepted/);
  });

  it('rejects duplicate run identities in the append-only ledger', () => {
    expect(() => parseAndValidateLedger(asJsonl(validRun(), validRun()))).toThrowError(
      'line 2, run run-332-001: duplicate run_id first declared on line 1'
    );
  });

  it('rejects duplicate accepted-change identities so retries cannot inflate acceptance', () => {
    const secondRun = validRun({ run_id: 'run-332-002' });

    expect(() => parseAndValidateLedger(asJsonl(validRun(), secondRun))).toThrowError(
      'line 2, run run-332-002: duplicate outcome.accepted_change "PR #333" first declared on line 1'
    );
  });

  it('calculates cost per accepted change across all attempts, including rejected work', () => {
    const rejected = validRun({
      run_id: 'run-332-002',
      usage: {
        iterations: 3,
        tokens: 18_000,
        cost_usd: 2.75,
      },
      stop: {
        reason: 'rejected',
        at: '2026-07-13T20:02:00.000Z',
      },
      evaluation: {
        agent_id: 'codex-evaluator-03',
        head_sha: 'a'.repeat(40),
        verdict: 'FAIL',
        at: '2026-07-13T20:03:00.000Z',
      },
      outcome: {
        accepted_change: null,
      },
    });
    const runs = parseAndValidateLedger(asJsonl(validRun(), rejected));

    expect(summarizeRuns(runs)).toEqual({
      attempts: 2,
      accepted_changes: 1,
      acceptance_rate: 0.5,
      total_cost_usd: 4,
      cost_per_accepted_change_usd: 4,
    });
  });

  it('uses null cost per accepted change when nothing was accepted', () => {
    const failed = validRun({
      evaluation: {
        agent_id: 'codex-evaluator-02',
        head_sha: 'a'.repeat(40),
        verdict: 'FAIL',
        at: '2026-07-13T20:03:00.000Z',
      },
      stop: {
        reason: 'rejected',
        at: '2026-07-13T20:02:00.000Z',
      },
      outcome: {
        accepted_change: null,
      },
    });
    const runs = parseAndValidateLedger(asJsonl(failed));

    expect(summarizeRuns(runs).cost_per_accepted_change_usd).toBeNull();
  });
});
