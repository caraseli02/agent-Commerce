import { describe, expect, it } from 'vitest';

import { independentReviewPassed, selectRepairSignal } from '../scripts/loop-signals.mjs';

const HEAD = 'a'.repeat(40);
const pr = (overrides: Record<string, unknown> = {}) => ({ number: 42, head: HEAD, checks: [], ...overrides });
const ci = (conclusion = 'FAILURE') => ({
  workflowName: 'CI',
  name: 'verify',
  status: 'COMPLETED',
  conclusion,
  detailsUrl: 'https://github.com/acme/repo/actions/runs/12345/job/9',
  completedAt: '2026-08-10T10:00:00Z',
});
const comment = (body: string, overrides: Record<string, unknown> = {}) => ({
  id: 77,
  body,
  author_association: 'OWNER',
  user: { login: 'maintainer' },
  created_at: '2026-08-10T10:05:00Z',
  html_url: 'https://github.com/acme/repo/pull/42#issuecomment-77',
  ...overrides,
});
const review = (state: string, overrides: Record<string, unknown> = {}) => ({
  id: 88,
  state,
  commit_id: HEAD,
  author_association: 'MEMBER',
  user: { login: 'reviewer' },
  submitted_at: '2026-08-10T10:10:00Z',
  html_url: 'https://github.com/acme/repo/pull/42#pullrequestreview-88',
  ...overrides,
});

describe('selectRepairSignal', () => {
  it('turns a completed CI failure into one stable current-head key', () => {
    expect(selectRepairSignal({ pr: pr({ checks: [ci()] }) })).toEqual({
      kind: 'ci-failure',
      sourceId: '12345',
      sourceUrl: ci().detailsUrl,
      head: HEAD,
      createdAt: ci().completedAt,
      key: `ci-failure:12345:${HEAD}`,
    });
  });

  it.each(['CANCELLED', 'SKIPPED', 'NEUTRAL'])('ignores a %s CI conclusion', (conclusion) => {
    expect(selectRepairSignal({ pr: pr({ checks: [ci(conclusion)] }) })).toBeNull();
  });

  it('requires an exact-head /repair command instead of ordinary prose', () => {
    for (const body of ['Please fix this.', '@codex fix this.', '/repair', `/repair ${'b'.repeat(40)} fix`, `/repair ${HEAD}   `]) {
      expect(selectRepairSignal({ pr: pr(), issueComments: [comment(body)] })).toBeNull();
    }
    expect(selectRepairSignal({ pr: pr(), issueComments: [comment(`/repair ${HEAD} Fix checkout.`)] })).toEqual({
      kind: 'repair-command',
      sourceId: '77',
      sourceUrl: comment('').html_url,
      head: HEAD,
      createdAt: comment('').created_at,
      instruction: 'Fix checkout.',
      key: `repair-command:77:${HEAD}`,
    });
  });

  it('accepts a trusted changes-requested review on the current head', () => {
    expect(selectRepairSignal({ pr: pr(), reviews: [review('CHANGES_REQUESTED')] })).toMatchObject({
      kind: 'changes-requested',
      sourceId: '88',
      head: HEAD,
    });
  });

  it('accepts Qodo and Greptile actions only for the reviewed head', () => {
    const qodo = comment(`<h3>Code Review by Qodo</h3><img alt="Action required"><!-- https://github.com/acme/repo/commit/${HEAD} -->`, {
      id: 99,
      user: { login: 'qodo-code-review[bot]' },
    });
    const greptile = comment(
      `<h3>Confidence Score: 2/5</h3>\nFiles Needing Attention\nLast reviewed commit: https://github.com/acme/repo/commit/${HEAD}`,
      { id: 101, user: { login: 'greptile-apps[bot]' } },
    );
    expect(selectRepairSignal({ pr: pr(), issueComments: [qodo] })).toMatchObject({ kind: 'qodo-review', sourceId: '99' });
    expect(selectRepairSignal({ pr: pr(), issueComments: [greptile] })).toMatchObject({ kind: 'greptile-review', sourceId: '101' });
    expect(selectRepairSignal({ pr: pr({ head: 'b'.repeat(40) }), issueComments: [qodo, greptile] })).toBeNull();
  });

  it('accepts a trusted root inline comment on the current head', () => {
    expect(
      selectRepairSignal({
        pr: pr(),
        reviewComments: [
          comment('This condition is reversed.', {
            id: 111,
            commit_id: HEAD,
            author_association: 'COLLABORATOR',
            html_url: 'https://github.com/acme/repo/pull/42#discussion_r111',
          }),
        ],
      }),
    ).toMatchObject({ kind: 'inline-review', sourceId: '111', head: HEAD, instruction: 'This condition is reversed.' });
  });

  it('skips a processed source-head pair and selects the next signal', () => {
    expect(
      selectRepairSignal({
        pr: pr({ checks: [ci()] }),
        processedKeys: new Set([`ci-failure:12345:${HEAD}`]),
        issueComments: [comment(`/repair ${HEAD} Address the follow-up.`, { id: 222 })],
      })?.key,
    ).toBe(`repair-command:222:${HEAD}`);
  });
});

describe('independentReviewPassed', () => {
  const greptile = (score: number) =>
    comment(
      `Confidence Score: ${score}/5${score < 5 ? '\nIssue 1' : ''}\nLast reviewed commit: https://github.com/acme/repo/commit/${HEAD}`,
      {
        user: { login: 'greptile-apps[bot]' },
      },
    );

  it('accepts a current-head Greptile 5/5 or trusted approval', () => {
    expect(independentReviewPassed({ pr: pr(), issueComments: [greptile(5)] })).toBe(true);
    expect(independentReviewPassed({ pr: pr(), reviews: [review('APPROVED')] })).toBe(true);
  });

  it('rejects actionable feedback and unresolved requested changes', () => {
    expect(independentReviewPassed({ pr: pr(), issueComments: [greptile(4)] })).toBe(false);
    expect(independentReviewPassed({ pr: pr(), reviews: [review('APPROVED'), review('CHANGES_REQUESTED')] })).toBe(false);
  });

  it('does not let COMMENTED clear requested changes', () => {
    const reviews = [review('CHANGES_REQUESTED', { id: 1 }), review('COMMENTED', { id: 2 })];
    expect(independentReviewPassed({ pr: pr(), reviews })).toBe(false);
    expect(selectRepairSignal({ pr: pr(), reviews })).toMatchObject({ kind: 'changes-requested', sourceId: '1' });
  });
});
