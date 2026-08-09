import { describe, expect, it } from 'vitest';

import { ciAllowsEvaluation, findPendingCiSignal } from '../scripts/loop-ci-intake.mjs';

const failedCheck = {
  __typename: 'CheckRun',
  workflowName: 'CI',
  name: 'verify',
  status: 'COMPLETED',
  conclusion: 'FAILURE',
  detailsUrl: 'https://github.com/caraseli02/Ecas/actions/runs/31319779713/job/1',
};

describe('loop CI intake', () => {
  it('selects a completed failed CI run once', () => {
    expect(
      findPendingCiSignal({
        pr: { number: 99, head: 'a'.repeat(40), statusCheckRollup: [failedCheck] },
        processedRunIds: new Set(),
      })
    ).toMatchObject({ kind: 'ci-failure', runId: '31319779713', head: 'a'.repeat(40) });

    expect(
      findPendingCiSignal({
        pr: { number: 99, head: 'a'.repeat(40), statusCheckRollup: [failedCheck] },
        processedRunIds: new Set(['31319779713']),
      })
    ).toBeNull();
  });

  it('does not classify successful or pending checks as repair work', () => {
    expect(
      findPendingCiSignal({
        pr: {
          number: 99,
          head: 'a'.repeat(40),
          statusCheckRollup: [{ ...failedCheck, conclusion: 'SUCCESS' }],
        },
      })
    ).toBeNull();

    expect(
      findPendingCiSignal({
        pr: {
          number: 99,
          head: 'a'.repeat(40),
          statusCheckRollup: [{ ...failedCheck, status: 'IN_PROGRESS', conclusion: null }],
        },
      })
    ).toBeNull();
  });

  it('allows evaluation only after successful current-head CI', () => {
    expect(ciAllowsEvaluation([{ ...failedCheck, conclusion: 'SUCCESS' }])).toBe(true);
    expect(ciAllowsEvaluation([failedCheck])).toBe(false);
    expect(ciAllowsEvaluation([{ ...failedCheck, status: 'IN_PROGRESS', conclusion: null }])).toBe(false);
    expect(ciAllowsEvaluation([])).toBe(false);
  });
});
