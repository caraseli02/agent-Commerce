import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseAndValidateLedger } from '../scripts/loop-accountability.mjs';
import { appendAccountabilityRecord, buildAccountabilityRecord } from '../scripts/loop-run-ledger.mjs';

const head = 'a'.repeat(40);
const completedAt = '2026-08-10T13:00:00.000Z';

function eventStream(threadId: string, items: unknown[] = [], usage = { input_tokens: 1200, output_tokens: 300 }) {
  return [{ type: 'thread.started', thread_id: threadId }, ...items, { type: 'turn.completed', usage }]
    .map((event) => JSON.stringify(event))
    .join('\n');
}

describe('loop run accountability ledger', () => {
  it('builds a valid independently evaluated repair record from Codex events', () => {
    const actorEvents = eventStream('generator-thread', [
      {
        type: 'item.completed',
        observed_at: '2026-08-10T12:58:00.000Z',
        item: {
          type: 'file_change',
          changes: [{ path: '/repo/scripts/fix.mjs', kind: 'update' }],
        },
      },
      {
        type: 'item.completed',
        observed_at: '2026-08-10T12:59:00.000Z',
        item: {
          type: 'command_execution',
          command: 'pnpm exec vitest run tests/fix.spec.ts',
          exit_code: 0,
        },
      },
    ]);

    const record = buildAccountabilityRecord({
      runId: 'attempt-42',
      role: 'ci-repair',
      pr: 99,
      issue: 42,
      branch: 'codex/issue-42',
      head,
      repoRoot: '/repo',
      actorEvents,
      evaluatorEvents: eventStream('evaluator-thread'),
      verdict: 'PASS',
      completedAt,
    });

    expect(parseAndValidateLedger(`${JSON.stringify(record)}\n`)).toHaveLength(1);
    expect(record).toMatchObject({
      agent: { id: 'generator-thread', role: 'ci-repair' },
      work: { issue: 42, branch: 'codex/issue-42', head_sha: head },
      usage: { iterations: 1, tokens: 1500, cost_usd: 0 },
      billing: { mode: 'chatgpt-subscription', cost_source: 'non-metered-local-login' },
      evaluation: { agent_id: 'evaluator-thread', verdict: 'PASS', head_sha: head },
      outcome: { accepted_change: `PR #99 @ ${head}` },
    });
    expect(record.actions).toEqual([
      { sequence: 1, at: '2026-08-10T12:58:00.000Z', kind: 'file', access: 'write', target: 'scripts/fix.mjs' },
      {
        sequence: 2,
        at: '2026-08-10T12:59:00.000Z',
        kind: 'command',
        command: 'pnpm exec vitest run tests/fix.spec.ts',
        exit_code: 0,
      },
    ]);
  });

  it('appends validated records without replacing prior history', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ecas-loop-ledger-'));
    const ledgerPath = join(directory, 'loop-runs.jsonl');
    const base = {
      role: 'review-repair',
      pr: 99,
      issue: 42,
      branch: 'codex/issue-42',
      head,
      repoRoot: '/repo',
      actorEvents: eventStream('generator-thread'),
      evaluatorEvents: eventStream('evaluator-thread'),
      verdict: 'FAIL' as const,
      completedAt,
    };

    appendAccountabilityRecord(ledgerPath, buildAccountabilityRecord({ ...base, runId: 'attempt-1' }));
    appendAccountabilityRecord(ledgerPath, buildAccountabilityRecord({ ...base, runId: 'attempt-2' }));

    const contents = readFileSync(ledgerPath, 'utf8');
    expect(parseAndValidateLedger(contents)).toHaveLength(2);
    expect(contents.trim().split('\n')).toHaveLength(2);
  });

  it('rejects prohibited commands and over-budget usage', () => {
    const base = {
      runId: 'attempt-42',
      role: 'ci-repair',
      pr: 99,
      issue: 42,
      branch: 'codex/issue-42',
      head,
      repoRoot: '/repo',
      evaluatorEvents: eventStream('evaluator-thread'),
      verdict: 'BLOCKED' as const,
      completedAt,
    };

    expect(() =>
      buildAccountabilityRecord({
        ...base,
        actorEvents: eventStream('generator-thread', [
          {
            type: 'item.completed',
            item: { type: 'command_execution', command: 'git push --force origin main', exit_code: 0 },
          },
        ]),
      })
    ).toThrow(/prohibited command/i);

    expect(() =>
      buildAccountabilityRecord({
        ...base,
        actorEvents: eventStream('generator-thread', [], { input_tokens: 100_000_001, output_tokens: 0 }),
      })
    ).toThrow(/exceeds budgets\.max_tokens/);
  });
});
