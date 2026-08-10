import { describe, expect, it } from 'vitest';

import { normalizeEvaluation } from '../scripts/loop-evaluation.mjs';

const passing = {
  verdict: 'PASS',
  summary: 'Issue requirements and checks pass.',
  evidence: ['pnpm verify: pass'],
  rubric: {
    scopeControl: 2,
    acceptanceCriteria: 2,
    verificationEvidence: 2,
    harnessHygiene: 1,
    riskReporting: 1,
  },
};

describe('normalizeEvaluation', () => {
  it('accepts PASS only for the same mergeable head with a passing rubric', () => {
    expect(
      normalizeEvaluation({
        value: passing,
        succeeded: true,
        expectedHead: 'a'.repeat(40),
        currentHead: 'a'.repeat(40),
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'CLEAN',
      })
    ).toMatchObject({ verdict: 'PASS', total: 8, stale: false });
  });

  it('rejects stale, failed-process, conflicting, and weak PASS results', () => {
    const base = {
      value: passing,
      succeeded: true,
      expectedHead: 'a'.repeat(40),
      currentHead: 'a'.repeat(40),
      mergeable: 'MERGEABLE',
      mergeStateStatus: 'CLEAN',
    };

    expect(normalizeEvaluation({ ...base, currentHead: 'b'.repeat(40) }).verdict).toBe('STALE');
    expect(normalizeEvaluation({ ...base, succeeded: false }).verdict).toBe('BLOCKED');
    expect(normalizeEvaluation({ ...base, mergeable: 'CONFLICTING', mergeStateStatus: 'DIRTY' }).verdict).toBe('FAIL');
    expect(normalizeEvaluation({ ...base, mergeable: 'UNKNOWN' })).toMatchObject({ verdict: 'DEFERRED', stale: true });
    expect(
      normalizeEvaluation({
        ...base,
        value: { ...passing, evidence: [], rubric: { ...passing.rubric, verificationEvidence: 0 } },
      }).verdict
    ).toBe('FAIL');
  });
});
