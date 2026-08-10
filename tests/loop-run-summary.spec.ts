import { describe, expect, it } from 'vitest';

import { buildRunSummary } from '../scripts/loop-run-summary.mjs';

describe('buildRunSummary', () => {
  it('records identity, usage, result, and trace location without duplicating actions', () => {
    const events = [
      JSON.stringify({ type: 'thread.started', thread_id: 'thread-123' }),
      JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 5 } }),
    ].join('\n');

    expect(
      buildRunSummary({
        runId: 'run-1',
        role: 'repair',
        pr: 42,
        issue: 7,
        head: 'a'.repeat(40),
        sourceKey: `ci-failure:1:${'a'.repeat(40)}`,
        startedAt: '2026-08-10T10:00:00Z',
        completedAt: '2026-08-10T10:05:00Z',
        result: 'submitted',
        tracePath: 'runs/run-1.jsonl',
        events,
      })
    ).toEqual({
      version: 1,
      runId: 'run-1',
      role: 'repair',
      pr: 42,
      issue: 7,
      head: 'a'.repeat(40),
      sourceKey: `ci-failure:1:${'a'.repeat(40)}`,
      startedAt: '2026-08-10T10:00:00Z',
      completedAt: '2026-08-10T10:05:00Z',
      result: 'submitted',
      tracePath: 'runs/run-1.jsonl',
      agentId: 'thread-123',
      usage: { turns: 1, inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    });
  });
});
