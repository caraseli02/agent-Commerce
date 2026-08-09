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
