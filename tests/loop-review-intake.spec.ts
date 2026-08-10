import { describe, expect, it } from 'vitest';

import { findPendingReviewSignal } from '../scripts/loop-review-intake.mjs';

const head = 'a'.repeat(40);

function qodoComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 1001,
    html_url: 'https://github.com/caraseli02/Ecas/pull/99#issuecomment-1001',
    created_at: '2026-08-09T12:00:00.000Z',
    author_association: 'NONE',
    user: { login: 'qodo-code-review' },
    body: `<h3>Code Review by Qodo</h3>
<img alt="Remediation recommended">
<!-- https://github.com/caraseli02/Ecas/commit/${head} -->`,
    ...overrides,
  };
}

describe('loop review intake', () => {
  it('selects an actionable trusted top-level PR comment after the current head commit', () => {
    expect(
      findPendingReviewSignal({
        pr: { number: 99, head: { sha: head, committedAt: '2026-08-09T11:59:00.000Z' } },
        issueComments: [
          {
            id: 901,
            html_url: 'https://github.com/caraseli02/Ecas/pull/99#issuecomment-901',
            created_at: '2026-08-09T12:00:00.000Z',
            author_association: 'OWNER',
            user: { login: 'caraseli02' },
            body: 'Please fix the timeout case.',
          },
        ],
      })
    ).toMatchObject({ kind: 'human-pr-comment', sourceId: '901', head });
  });

  it('ignores stale, non-actionable, and controller-authored top-level comments', () => {
    expect(
      findPendingReviewSignal({
        pr: { number: 99, head: { sha: head, committedAt: '2026-08-09T12:30:00.000Z' } },
        issueComments: [
          {
            id: 902,
            created_at: '2026-08-09T12:00:00.000Z',
            author_association: 'OWNER',
            user: { login: 'caraseli02' },
            body: 'Please fix this stale case.',
          },
          {
            id: 903,
            created_at: '2026-08-09T12:31:00.000Z',
            author_association: 'OWNER',
            user: { login: 'caraseli02' },
            body: 'Thanks for the update.',
          },
          {
            id: 904,
            created_at: '2026-08-09T12:32:00.000Z',
            author_association: 'OWNER',
            user: { login: 'caraseli02' },
            body: 'Repair FAILED. <!-- ecas-repair:v1 pr=99 repairs_for=1 attempt=x status=FAILED -->',
          },
        ],
      })
    ).toBeNull();
  });

  it('selects an actionable Qodo review for the current PR head', () => {
    expect(
      findPendingReviewSignal({
        pr: { number: 99, head: { sha: head } },
        issueComments: [qodoComment()],
        reviews: [],
        processedSourceIds: new Set(),
      })
    ).toMatchObject({ kind: 'qodo-review', sourceId: '1001', head });
  });

  it('ignores stale, non-actionable, and already processed Qodo reports', () => {
    const stale = qodoComment({
      id: 1002,
      body: `<h3>Code Review by Qodo</h3><img alt="Action required"><!-- https://github.com/caraseli02/Ecas/commit/${'b'.repeat(40)} -->`,
    });
    const summaryOnly = qodoComment({ id: 1003, body: `<h3>PR Summary by Qodo</h3>` });

    expect(
      findPendingReviewSignal({
        pr: { number: 99, head: { sha: head } },
        issueComments: [stale, summaryOnly, qodoComment()],
        reviews: [],
        processedSourceIds: new Set(['1001']),
      })
    ).toBeNull();
  });

  it('selects a trusted current-head changes-requested review', () => {
    expect(
      findPendingReviewSignal({
        pr: { number: 99, head: { sha: head } },
        issueComments: [],
        reviews: [
          {
            id: 2001,
            html_url: 'https://github.com/caraseli02/Ecas/pull/99#pullrequestreview-2001',
            submitted_at: '2026-08-09T12:01:00.000Z',
            author_association: 'OWNER',
            user: { login: 'caraseli02' },
            state: 'CHANGES_REQUESTED',
            commit_id: head,
            body: 'Please address the requested changes.',
          },
        ],
        processedSourceIds: new Set(),
      })
    ).toMatchObject({ kind: 'human-review', sourceId: '2001', head });
  });

  it('selects trusted current-head inline and review-body feedback', () => {
    expect(
      findPendingReviewSignal({
        pr: { number: 99, head: { sha: head } },
        issueComments: [],
        reviewComments: [
          {
            id: 3001,
            html_url: 'https://github.com/caraseli02/Ecas/pull/99#discussion_r3001',
            created_at: '2026-08-09T12:03:00.000Z',
            author_association: 'OWNER',
            user: { login: 'caraseli02' },
            commit_id: head,
            body: 'This branch can return the wrong status.',
          },
        ],
        reviews: [],
      })
    ).toMatchObject({ kind: 'human-inline-comment', sourceId: '3001', head });

    expect(
      findPendingReviewSignal({
        pr: { number: 99, head: { sha: head } },
        issueComments: [],
        reviewComments: [],
        reviews: [
          {
            id: 3002,
            html_url: 'https://github.com/caraseli02/Ecas/pull/99#pullrequestreview-3002',
            submitted_at: '2026-08-09T12:04:00.000Z',
            author_association: 'MEMBER',
            user: { login: 'reviewer' },
            state: 'COMMENTED',
            commit_id: head,
            body: 'Please cover the timeout case.',
          },
        ],
      })
    ).toMatchObject({ kind: 'human-review-comment', sourceId: '3002', head });
  });

  it('ignores stale, reply, untrusted, and positive-only human comments', () => {
    expect(
      findPendingReviewSignal({
        pr: { number: 99, head: { sha: head } },
        issueComments: [],
        reviewComments: [
          {
            id: 4001,
            author_association: 'OWNER',
            user: { login: 'caraseli02' },
            commit_id: 'b'.repeat(40),
            body: 'stale',
          },
          {
            id: 4002,
            author_association: 'OWNER',
            user: { login: 'caraseli02' },
            commit_id: head,
            in_reply_to_id: 3001,
            body: 'Thanks',
          },
          {
            id: 4003,
            author_association: 'NONE',
            user: { login: 'stranger' },
            commit_id: head,
            body: 'Change this',
          },
        ],
        reviews: [
          {
            id: 4004,
            author_association: 'OWNER',
            user: { login: 'caraseli02' },
            state: 'COMMENTED',
            commit_id: head,
            body: 'LGTM',
          },
        ],
      })
    ).toBeNull();
  });

  it('ignores change requests from untrusted authors', () => {
    expect(
      findPendingReviewSignal({
        pr: { number: 99, head: { sha: head } },
        issueComments: [],
        reviews: [
          {
            id: 2002,
            submitted_at: '2026-08-09T12:02:00.000Z',
            author_association: 'NONE',
            user: { login: 'unknown-reviewer' },
            state: 'CHANGES_REQUESTED',
            commit_id: head,
          },
        ],
        processedSourceIds: new Set(),
      })
    ).toBeNull();
  });
});
