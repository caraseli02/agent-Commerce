import { describe, expect, it } from 'vitest';

import { selectRepairSignal } from '../scripts/loop-signals.mjs';

describe('selectRepairSignal', () => {
  it('turns a completed current-head CI failure into one stable work key', () => {
    const signal = selectRepairSignal({
      pr: {
        number: 42,
        head: 'a'.repeat(40),
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

    expect(signal).toEqual({
      kind: 'ci-failure',
      sourceId: '12345',
      sourceUrl: 'https://github.com/acme/repo/actions/runs/12345/job/9',
      head: 'a'.repeat(40),
      createdAt: '2026-08-10T10:00:00Z',
      key: `ci-failure:12345:${'a'.repeat(40)}`,
    });
  });

  it('does not treat non-failure CI conclusions as code repair work', () => {
    for (const conclusion of ['CANCELLED', 'SKIPPED', 'NEUTRAL']) {
      expect(
        selectRepairSignal({
          pr: {
            head: '9'.repeat(40),
            checks: [
              {
                workflowName: 'CI',
                name: 'verify',
                status: 'COMPLETED',
                conclusion,
                detailsUrl: 'https://github.com/acme/repo/actions/runs/12345/job/9',
              },
            ],
          },
        })
      ).toBeNull();
    }
  });

  it('requires an explicit command before ordinary PR prose can trigger a repair', () => {
    const head = 'b'.repeat(40);
    const base = {
      number: 42,
      head,
      headCommittedAt: '2026-08-10T10:00:00Z',
      checks: [],
    };
    const trustedComment = {
      id: 77,
      author_association: 'OWNER',
      user: { login: 'maintainer' },
      created_at: '2026-08-10T10:05:00Z',
      html_url: 'https://github.com/acme/repo/pull/42#issuecomment-77',
    };

    expect(
      selectRepairSignal({
        pr: base,
        issueComments: [{ ...trustedComment, body: 'Please fix the failing checkout test.' }],
      })
    ).toBeNull();

    expect(
      selectRepairSignal({
        pr: base,
        issueComments: [{ ...trustedComment, body: '/repair Fix the failing checkout test.' }],
      })
    ).toEqual({
      kind: 'repair-command',
      sourceId: '77',
      sourceUrl: trustedComment.html_url,
      head,
      createdAt: trustedComment.created_at,
      instruction: 'Fix the failing checkout test.',
      key: `repair-command:77:${head}`,
    });
  });

  it('accepts a trusted changes-requested review on the current head', () => {
    const head = 'c'.repeat(40);
    const signal = selectRepairSignal({
      pr: { number: 42, head, checks: [] },
      reviews: [
        {
          id: 88,
          state: 'CHANGES_REQUESTED',
          commit_id: head,
          author_association: 'MEMBER',
          user: { login: 'reviewer' },
          submitted_at: '2026-08-10T10:10:00Z',
          html_url: 'https://github.com/acme/repo/pull/42#pullrequestreview-88',
        },
      ],
    });

    expect(signal).toEqual({
      kind: 'changes-requested',
      sourceId: '88',
      sourceUrl: 'https://github.com/acme/repo/pull/42#pullrequestreview-88',
      head,
      createdAt: '2026-08-10T10:10:00Z',
      key: `changes-requested:88:${head}`,
    });
  });

  it('accepts a Qodo action only when it names the current head', () => {
    const head = 'd'.repeat(40);
    const qodoComment = {
      id: 99,
      user: { login: 'qodo-code-review[bot]' },
      body: `<h3>Code Review by Qodo</h3><img alt="Action required"><!-- https://github.com/acme/repo/commit/${head} -->`,
      created_at: '2026-08-10T10:15:00Z',
      html_url: 'https://github.com/acme/repo/pull/42#issuecomment-99',
    };

    expect(selectRepairSignal({ pr: { number: 42, head, checks: [] }, issueComments: [qodoComment] })).toEqual({
      kind: 'qodo-review',
      sourceId: '99',
      sourceUrl: qodoComment.html_url,
      head,
      createdAt: qodoComment.created_at,
      instruction: qodoComment.body,
      key: `qodo-review:99:${head}`,
    });

    expect(
      selectRepairSignal({
        pr: { number: 42, head: 'e'.repeat(40), checks: [] },
        issueComments: [qodoComment],
      })
    ).toBeNull();
  });

  it('accepts a trusted root inline review comment on the current head', () => {
    const head = 'f'.repeat(40);
    const signal = selectRepairSignal({
      pr: { number: 42, head, checks: [] },
      reviewComments: [
        {
          id: 111,
          body: 'This condition is reversed.',
          commit_id: head,
          author_association: 'COLLABORATOR',
          user: { login: 'reviewer' },
          created_at: '2026-08-10T10:20:00Z',
          html_url: 'https://github.com/acme/repo/pull/42#discussion_r111',
        },
      ],
    });

    expect(signal).toEqual({
      kind: 'inline-review',
      sourceId: '111',
      sourceUrl: 'https://github.com/acme/repo/pull/42#discussion_r111',
      head,
      createdAt: '2026-08-10T10:20:00Z',
      instruction: 'This condition is reversed.',
      key: `inline-review:111:${head}`,
    });
  });

  it('skips an already processed source-head pair', () => {
    const head = '1'.repeat(40);
    const ciKey = `ci-failure:12345:${head}`;
    const signal = selectRepairSignal({
      pr: {
        number: 42,
        head,
        headCommittedAt: '2026-08-10T10:00:00Z',
        checks: [
          {
            workflowName: 'CI',
            name: 'verify',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            detailsUrl: 'https://github.com/acme/repo/actions/runs/12345/job/9',
            completedAt: '2026-08-10T10:01:00Z',
          },
        ],
      },
      processedKeys: new Set([ciKey]),
      issueComments: [
        {
          id: 222,
          body: '/repair Address the reviewer follow-up.',
          author_association: 'OWNER',
          user: { login: 'maintainer' },
          created_at: '2026-08-10T10:05:00Z',
          html_url: 'https://github.com/acme/repo/pull/42#issuecomment-222',
        },
      ],
    });

    expect(signal?.key).toBe(`repair-command:222:${head}`);
  });
});
