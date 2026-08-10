import { describe, expect, it } from 'vitest';

import { beginEvaluation, beginRepair, createLoopState } from '../scripts/loop-state.mjs';
import { decideNextAction } from '../scripts/loop-policy.mjs';

describe('decideNextAction', () => {
  it('dispatches one repair only for the single linked in-progress issue', () => {
    const head = 'a'.repeat(40);
    const action = decideNextAction({
      state: createLoopState(),
      activeIssues: [{ number: 7, state: 'open', labels: [{ name: 'in-progress' }] }],
      pr: {
        number: 42,
        head,
        linkedIssues: [7],
        checks: [
          {
            workflowName: 'CI',
            name: 'verify',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            detailsUrl: 'https://github.com/acme/repo/actions/runs/12345/job/9',
            completedAt: '2026-08-10T10:00:00Z',
          },
        ],
      },
    });

    expect(action).toMatchObject({ type: 'repair', issue: 7, pr: 42, head, signal: { kind: 'ci-failure' } });
  });

  it('fails closed when the active issue is not uniquely linked to the PR', () => {
    const action = decideNextAction({
      state: createLoopState(),
      activeIssues: [
        { number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] },
        { number: 8, state: 'OPEN', labels: [{ name: 'in-progress' }] },
      ],
      pr: { number: 42, head: 'a'.repeat(40), linkedIssues: [7], checks: [] },
    });

    expect(action).toEqual({ type: 'idle', reason: 'no-single-linked-work-item' });
  });

  it('dispatches one evaluator after current-head CI succeeds', () => {
    const head = 'b'.repeat(40);
    const action = decideNextAction({
      state: createLoopState(),
      activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
      pr: {
        number: 42,
        head,
        linkedIssues: [7],
        checks: [{ workflowName: 'CI', name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS' }],
      },
    });

    expect(action).toEqual({ type: 'evaluate', pr: 42, issue: 7, head });
  });

  it('blocks a third repair and never evaluates the same head twice', () => {
    const head = 'c'.repeat(40);
    const state = createLoopState();
    beginRepair(state, { pr: 42, key: 'first', head, at: '2026-08-10T10:00:00Z' });
    beginRepair(state, { pr: 42, key: 'second', head, at: '2026-08-10T10:05:00Z' });
    const base = {
      state,
      activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
      pr: {
        number: 42,
        head,
        headCommittedAt: '2026-08-10T10:00:00Z',
        linkedIssues: [7],
        checks: [],
      },
    };
    const blocked = decideNextAction({
      ...base,
      issueComments: [
        {
          id: 333,
          body: '/repair Try again.',
          author_association: 'OWNER',
          created_at: '2026-08-10T10:10:00Z',
          html_url: 'https://github.com/acme/repo/pull/42#issuecomment-333',
        },
      ],
    });
    expect(blocked).toEqual({ type: 'blocked', reason: 'repair-attempt-limit', pr: 42, issue: 7 });

    const passingCi = [{ workflowName: 'CI', name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS' }];
    beginEvaluation(state, { pr: 42, head, at: '2026-08-10T10:20:00Z' });
    expect(decideNextAction({ ...base, pr: { ...base.pr, checks: passingCi } })).toEqual({
      type: 'idle',
      reason: 'no-pending-signal',
    });
  });
});
