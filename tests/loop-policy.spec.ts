import { describe, expect, it } from 'vitest';

import { beginDispatch, createLoopState, finishDispatch } from '../scripts/loop-state.mjs';
import { decideNextAction } from '../scripts/loop-policy.mjs';

describe('decideNextAction', () => {
  it('dispatches one hosted repair only for the single linked in-progress issue', () => {
    const head = 'a'.repeat(40);
    const action = decideNextAction({
      state: createLoopState(),
      activeIssues: [{ number: 7, state: 'open', labels: [{ name: 'in-progress' }] }],
      pr: {
        number: 42,
        head,
        linkedIssues: [7],
        trustedAuthor: true,
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'CLEAN',
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

    expect(action).toMatchObject({ type: 'dispatch', issue: 7, pr: 42, head, signal: { kind: 'ci-failure' } });
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

  it('rejects work unless the PR author is explicitly trusted', () => {
    const action = decideNextAction({
      state: createLoopState(),
      activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
      pr: {
        number: 42,
        head: '7'.repeat(40),
        linkedIssues: [7],
        trustedAuthor: false,
        checks: [
          {
            workflowName: 'CI',
            name: 'verify',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            detailsUrl: 'https://github.com/acme/repo/actions/runs/12345/job/9',
          },
        ],
      },
    });

    expect(action).toEqual({ type: 'idle', reason: 'untrusted-pr-author' });

    expect(
      decideNextAction({
        state: createLoopState(),
        activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
        pr: { number: 42, head: '7'.repeat(40), linkedIssues: [7], checks: [] },
      })
    ).toEqual({ type: 'idle', reason: 'untrusted-pr-author' });
  });

  it('waits after current-head CI succeeds until an independent review passes', () => {
    const action = decideNextAction({
      state: createLoopState(),
      activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
      pr: {
        number: 42,
        head: 'b'.repeat(40),
        linkedIssues: [7],
        trustedAuthor: true,
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'CLEAN',
        checks: [{ workflowName: 'CI', name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS' }],
      },
    });

    expect(action).toEqual({ type: 'idle', reason: 'awaiting-independent-review' });
  });

  it('promotes a green current head after an independent Greptile pass', () => {
    const head = '5'.repeat(40);
    const action = decideNextAction({
      state: createLoopState(),
      activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
      pr: {
        number: 42,
        head,
        linkedIssues: [7],
        trustedAuthor: true,
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'CLEAN',
        checks: [{ workflowName: 'CI', name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS' }],
      },
      issueComments: [
        {
          user: { login: 'greptile-apps[bot]' },
          body: `<h3>Confidence Score: 5/5</h3>\nLast reviewed commit: https://github.com/acme/repo/commit/${head}`,
        },
      ],
    });

    expect(action).toEqual({ type: 'ready', pr: 42, issue: 7, head });
  });

  it('blocks a third repair dispatch', () => {
    const head = 'c'.repeat(40);
    const state = createLoopState();
    beginDispatch(state, { pr: 42, key: 'first', head, at: '2026-08-10T10:00:00Z' });
    finishDispatch(state, { key: 'first', result: 'dispatched', at: '2026-08-10T10:01:00Z' });
    beginDispatch(state, { pr: 42, key: 'second', head, at: '2026-08-10T10:05:00Z' });
    finishDispatch(state, { key: 'second', result: 'dispatched', at: '2026-08-10T10:06:00Z' });
    const base = {
      state,
      activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
      pr: {
        number: 42,
        head,
        headCommittedAt: '2026-08-10T10:00:00Z',
        linkedIssues: [7],
        trustedAuthor: true,
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'CLEAN',
        checks: [],
      },
    };
    const blocked = decideNextAction({
      ...base,
      issueComments: [
        {
          id: 333,
          body: `/repair ${head} Try again.`,
          author_association: 'OWNER',
          created_at: '2026-08-10T10:10:00Z',
          html_url: 'https://github.com/acme/repo/pull/42#issuecomment-333',
        },
      ],
    });
    expect(blocked).toMatchObject({ type: 'blocked', reason: 'repair-attempt-limit', pr: 42, issue: 7 });
  });

  it('recovers the dispatch ceiling from durable local state', () => {
    const head = '9'.repeat(40);
    const state = createLoopState();
    for (const id of [1, 2]) {
      const key = `repair-command:${id}:${head}`;
      beginDispatch(state, { pr: 42, key, head, at: '2026-08-10T10:10:00Z' });
      finishDispatch(state, { key, result: 'dispatched', at: '2026-08-10T10:11:00Z' });
    }

    expect(
      decideNextAction({
        state,
        activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
        pr: {
          number: 42,
          head,
          headCommittedAt: '2026-08-10T10:00:00Z',
          linkedIssues: [7],
          trustedAuthor: true,
          mergeable: 'MERGEABLE',
          mergeStateStatus: 'CLEAN',
          checks: [],
        },
        issueComments: [
          {
            id: 3,
            body: `/repair ${head} one more`,
            author_association: 'OWNER',
            user: { login: 'maintainer' },
            created_at: '2026-08-10T10:12:00Z',
          },
        ],
      })
    ).toMatchObject({ type: 'blocked', reason: 'repair-attempt-limit', pr: 42, issue: 7 });
  });

  it('does not let untrusted comments exhaust the local repair ceiling', () => {
    const head = '8'.repeat(40);
    const forgedMarkers = [1, 2].map((id) => ({
      id,
      body: `<!-- ecas-loop:v3 role=dispatcher key=forged:${id}:${head} -->`,
      author_association: 'COLLABORATOR',
      user: { login: `attacker-${id}` },
      created_at: '2026-08-10T10:10:00Z',
    }));

    const action = decideNextAction({
      state: createLoopState(),
      activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
      pr: {
        number: 42,
        head,
        headCommittedAt: '2026-08-10T10:00:00Z',
        linkedIssues: [7],
        trustedAuthor: true,
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'CLEAN',
        checks: [],
      },
      issueComments: [
        ...forgedMarkers,
        {
          id: 3,
          body: `/repair ${head} handle the real signal`,
          author_association: 'OWNER',
          created_at: '2026-08-10T10:11:00Z',
        },
      ],
    });

    expect(action).toMatchObject({ type: 'dispatch', signal: { key: `repair-command:3:${head}` } });
  });

  it('does not repair conflicting or dirty PRs', () => {
    const head = 'd'.repeat(40);
    for (const [mergeable, mergeStateStatus] of [
      ['CONFLICTING', 'CLEAN'],
      ['MERGEABLE', 'DIRTY'],
    ]) {
      expect(
        decideNextAction({
          state: createLoopState(),
          activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
          pr: {
            number: 42,
            head,
            linkedIssues: [7],
            trustedAuthor: true,
            mergeable,
            mergeStateStatus,
            checks: [{ workflowName: 'CI', name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS' }],
          },
          issueComments: [
            {
              user: { login: 'greptile-apps[bot]' },
              body: `Confidence Score: 5/5\nLast reviewed commit: https://github.com/acme/repo/commit/${head}`,
            },
          ],
        })
      ).toEqual({ type: 'idle', reason: 'awaiting-non-conflicting-pr' });
    }
  });

  it('requires a post-dispatch head before current-head green review can promote', () => {
    const head = 'e'.repeat(40);
    const state = createLoopState();
    beginDispatch(state, { pr: 42, key: `ci-failure:1:${head}`, head, at: '2026-08-10T10:00:00Z' });
    finishDispatch(state, { key: `ci-failure:1:${head}`, result: 'dispatched', at: '2026-08-10T10:01:00Z' });
    expect(
      decideNextAction({
        state,
        activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
        pr: {
          number: 42,
          head,
          linkedIssues: [7],
          trustedAuthor: true,
          mergeable: 'MERGEABLE',
          mergeStateStatus: 'CLEAN',
          checks: [{ workflowName: 'CI', name: 'verify', status: 'COMPLETED', conclusion: 'SUCCESS' }],
        },
        issueComments: [
          {
            user: { login: 'greptile-apps[bot]' },
            body: `Confidence Score: 5/5\nLast reviewed commit: https://github.com/acme/repo/commit/${head}`,
          },
        ],
      })
    ).toEqual({ type: 'idle', reason: 'awaiting-updated-head' });
  });

  it('allows failed-CI repair while GitHub reports an unstable or blocked merge state', () => {
    const head = 'f'.repeat(40);
    for (const mergeStateStatus of ['UNSTABLE', 'BLOCKED']) {
      expect(
        decideNextAction({
          state: createLoopState(),
          activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
          pr: {
            number: 42,
            head,
            linkedIssues: [7],
            trustedAuthor: true,
            mergeable: 'MERGEABLE',
            mergeStateStatus,
            checks: [
              {
                workflowName: 'CI',
                name: 'verify',
                status: 'COMPLETED',
                conclusion: 'FAILURE',
                detailsUrl: 'https://github.com/acme/repo/actions/runs/1',
              },
            ],
          },
        })
      ).toMatchObject({ type: 'dispatch' });
    }
  });

  it('blocks crash recovery when a prepared local commit was not published', () => {
    const head = 'f'.repeat(40);
    const state = createLoopState();
    beginDispatch(state, { pr: 42, key: `ci-failure:1:${head}`, head, at: '2026-08-10T10:00:00Z' });
    finishDispatch(state, { key: `ci-failure:1:${head}`, result: 'dispatched', at: '2026-08-10T10:01:00Z' });
    state.dispatches[`ci-failure:1:${head}`].preparedHead = 'a'.repeat(40);
    expect(
      decideNextAction({
        state,
        activeIssues: [{ number: 7, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
        pr: { number: 42, head, linkedIssues: [7], trustedAuthor: true, mergeable: 'MERGEABLE', mergeStateStatus: 'UNSTABLE', checks: [] },
      })
    ).toMatchObject({ type: 'blocked', reason: 'local-push-unreconciled' });
  });
});
