import { describe, expect, it } from 'vitest';

import {
  beginEvaluation,
  beginRepair,
  canRepair,
  createLoopState,
  finishEvaluation,
  finishRepair,
  hasEvaluation,
  processedKeys,
} from '../scripts/loop-state.mjs';

describe('loop state', () => {
  it('deduplicates a source-head pair and enforces the two-attempt ceiling', () => {
    const state = createLoopState();
    const firstKey = `ci-failure:1:${'a'.repeat(40)}`;
    const secondKey = `changes-requested:2:${'b'.repeat(40)}`;

    beginRepair(state, { pr: 42, key: firstKey, head: 'a'.repeat(40), at: '2026-08-10T10:00:00Z' });
    finishRepair(state, { key: firstKey, result: 'submitted', headAfter: 'b'.repeat(40), at: '2026-08-10T10:10:00Z' });
    beginRepair(state, { pr: 42, key: secondKey, head: 'b'.repeat(40), at: '2026-08-10T10:20:00Z' });

    expect([...processedKeys(state)]).toEqual([firstKey, secondKey]);
    expect(canRepair(state, 42)).toBe(false);
    expect(state.repairs[firstKey]).toMatchObject({ result: 'submitted', headAfter: 'b'.repeat(40) });
  });

  it('allows only one evaluator run per head', () => {
    const state = createLoopState();
    const head = 'c'.repeat(40);

    expect(hasEvaluation(state, head)).toBe(false);
    beginEvaluation(state, { pr: 42, head, at: '2026-08-10T11:00:00Z' });
    expect(hasEvaluation(state, head)).toBe(true);
    finishEvaluation(state, { head, verdict: 'FAIL', at: '2026-08-10T11:10:00Z' });

    expect(state.evaluations[head]).toEqual({
      pr: 42,
      startedAt: '2026-08-10T11:00:00Z',
      verdict: 'FAIL',
      completedAt: '2026-08-10T11:10:00Z',
    });
  });
});
