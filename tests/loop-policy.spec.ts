import { describe, expect, it } from 'vitest';

import { decideNextAction } from '../scripts/loop-policy.mjs';
import { beginDispatch, createLoopState, finishDispatch } from '../scripts/loop-state.mjs';

const HEAD = 'a'.repeat(40);
const issue = (number = 7) => ({ number, state: 'OPEN', labels: [{ name: 'in-progress' }] });
const check = (conclusion = 'FAILURE') => ({
  workflowName: 'CI',
  name: 'verify',
  status: 'COMPLETED',
  conclusion,
  detailsUrl: 'https://github.com/acme/repo/actions/runs/12345/job/9',
  completedAt: '2026-08-10T10:00:00Z',
});
const pr = (overrides: Record<string, unknown> = {}) => ({
  number: 42,
  head: HEAD,
  linkedIssues: [7],
  targetSafe: true,
  trustedAuthor: true,
  mergeable: 'MERGEABLE',
  mergeStateStatus: 'CLEAN',
  checks: [check()],
  ...overrides,
});
const command = (head = HEAD, id = 3) => ({
  id,
  body: `/repair ${head} apply the bounded fix`,
  author_association: 'OWNER',
  user: { login: 'maintainer' },
  created_at: '2026-08-10T10:12:00Z',
  html_url: `https://github.com/acme/repo/pull/42#issuecomment-${id}`,
});
const greptilePass = (head = HEAD) => ({
  user: { login: 'greptile-apps[bot]' },
  body: `Confidence Score: 5/5\nLast reviewed commit: https://github.com/acme/repo/commit/${head}`,
});
const decide = (overrides: Record<string, unknown> = {}) =>
  decideNextAction({
    state: createLoopState(),
    activeIssues: [issue()],
    pr: pr(),
    now: Date.parse('2026-08-10T11:00:00Z'),
    ...overrides,
  });

function consumeAttempts(state: ReturnType<typeof createLoopState>, head = HEAD) {
  for (const key of ['first', 'second']) {
    beginDispatch(state, { pr: 42, key, head, at: '2026-08-10T10:00:00Z' });
    finishDispatch(state, { key, result: 'dispatched', at: '2026-08-10T10:01:00Z' });
  }
}

describe('decideNextAction', () => {
  it('dispatches only for one linked in-progress issue and a trusted author', () => {
    expect(decide()).toMatchObject({ type: 'dispatch', issue: 7, pr: 42, head: HEAD, signal: { kind: 'ci-failure' } });
    expect(decide({ activeIssues: [issue(), issue(8)] })).toEqual({ type: 'idle', reason: 'no-single-linked-work-item' });
    expect(decide({ pr: pr({ targetSafe: false }) })).toEqual({ type: 'idle', reason: 'unsafe-pr-target' });
    expect(decide({ pr: pr({ trustedAuthor: false }) })).toEqual({ type: 'idle', reason: 'untrusted-pr-author' });
    expect(decide({ pr: pr({ trustedAuthor: undefined }) })).toEqual({ type: 'idle', reason: 'untrusted-pr-author' });
  });

  it('promotes green current-head work only after independent review', () => {
    const green = pr({ checks: [check('SUCCESS')] });
    expect(decide({ pr: green })).toEqual({ type: 'idle', reason: 'awaiting-independent-review' });
    expect(decide({ pr: green, issueComments: [greptilePass()] })).toEqual({ type: 'ready', pr: 42, issue: 7, head: HEAD });
  });

  it('blocks after two consumed repair attempts', () => {
    const state = createLoopState();
    consumeAttempts(state);
    expect(decide({ state, pr: pr({ checks: [] }), issueComments: [command()] })).toMatchObject({
      type: 'blocked',
      reason: 'repair-attempt-limit',
      attempts: 2,
    });
  });

  it('does not launch another signal while a hosted writer is in flight', () => {
    const state = createLoopState();
    beginDispatch(state, { pr: 42, key: `ci-failure:1:${HEAD}`, head: HEAD, at: '2026-08-10T10:00:00Z' });
    finishDispatch(state, { key: `ci-failure:1:${HEAD}`, result: 'published', at: '2026-08-10T10:01:00Z' });
    expect(
      decide({
        state,
        now: Date.parse('2026-08-10T10:05:00Z'),
        pr: pr({ mergeStateStatus: 'UNSTABLE' }),
        issueComments: [command()],
      }),
    ).toEqual({ type: 'idle', reason: 'awaiting-hosted-repair' });
  });

  it('recovers the attempt ceiling from durable state', () => {
    const state = createLoopState();
    consumeAttempts(state, '9'.repeat(40));
    const head = '9'.repeat(40);
    expect(decide({ state, pr: pr({ head, checks: [] }), issueComments: [command(head)] })).toMatchObject({
      type: 'blocked',
      reason: 'repair-attempt-limit',
    });
  });

  it('does not let untrusted dispatch markers consume the local ceiling', () => {
    const forged = [1, 2].map((id) => ({
      body: `<!-- ecas-loop:v3 role=dispatcher key=forged:${id}:${HEAD} -->`,
      author_association: 'COLLABORATOR',
      user: { login: `attacker-${id}` },
    }));
    expect(decide({ pr: pr({ checks: [] }), issueComments: [...forged, command()] })).toMatchObject({
      type: 'dispatch',
      signal: { key: `repair-command:3:${HEAD}` },
    });
  });

  it.each([
    ['CONFLICTING', 'CLEAN'],
    ['MERGEABLE', 'DIRTY'],
  ])('does not repair a %s/%s PR', (mergeable, mergeStateStatus) => {
    expect(decide({ pr: pr({ mergeable, mergeStateStatus }), issueComments: [greptilePass()] })).toEqual({
      type: 'idle',
      reason: 'awaiting-non-conflicting-pr',
    });
  });

  it('requires a new head before a successful dispatched head can promote', () => {
    const state = createLoopState();
    beginDispatch(state, { pr: 42, key: 'repair', head: HEAD, at: '2026-08-10T10:00:00Z' });
    finishDispatch(state, { key: 'repair', result: 'dispatched', at: '2026-08-10T10:01:00Z' });
    expect(decide({ state, pr: pr({ checks: [check('SUCCESS')] }), issueComments: [greptilePass()] })).toEqual({
      type: 'idle',
      reason: 'awaiting-updated-head',
    });
  });

  it.each(['UNSTABLE', 'BLOCKED'])('allows failed-CI repair while merge state is %s', (mergeStateStatus) => {
    expect(decide({ pr: pr({ mergeStateStatus }) })).toMatchObject({ type: 'dispatch' });
  });
});
