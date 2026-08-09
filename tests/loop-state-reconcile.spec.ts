import { describe, expect, it } from 'vitest';

import { planClosedIssueLabelRepairs } from '../scripts/loop-state-reconcile.mjs';

describe('loop state reconciliation', () => {
  it('removes only workflow labels from closed issues', () => {
    expect(
      planClosedIssueLabelRepairs([
        {
          number: 42,
          state: 'CLOSED',
          labels: [
            { name: 'ready-for-agent' },
            { name: 'in-progress' },
            { name: 'ready-for-human' },
            { name: 'priority:high' },
            { name: 'bug' },
          ],
        },
      ])
    ).toEqual([{ number: 42, removeLabels: ['in-progress', 'ready-for-agent', 'ready-for-human'] }]);
  });

  it('ignores open issues and closed issues without stale workflow labels', () => {
    expect(
      planClosedIssueLabelRepairs([
        { number: 10, state: 'OPEN', labels: [{ name: 'in-progress' }] },
        { number: 11, state: 'CLOSED', labels: [{ name: 'priority:medium' }] },
      ])
    ).toEqual([]);
  });

  it('deduplicates issues gathered through multiple label queries', () => {
    expect(
      planClosedIssueLabelRepairs([
        { number: 7, state: 'CLOSED', labels: [{ name: 'blocked' }, { name: 'in-progress' }] },
        { number: 7, state: 'CLOSED', labels: [{ name: 'blocked' }, { name: 'in-progress' }] },
      ])
    ).toEqual([{ number: 7, removeLabels: ['blocked', 'in-progress'] }]);
  });
});
