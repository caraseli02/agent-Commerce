import { describe, expect, it } from 'vitest';

import { findClaimedIssueForPr } from '../scripts/loop-work-intake.mjs';

describe('loop work intake', () => {
  it('accepts the only active issue when the PR closes it', () => {
    expect(
      findClaimedIssueForPr({
        pr: { closingIssuesReferences: [{ number: 42 }, { number: 99 }] },
        activeIssues: [{ number: 42, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
      })
    ).toMatchObject({ number: 42 });
  });

  it('rejects unrelated and unlinked owner PRs', () => {
    expect(
      findClaimedIssueForPr({
        pr: { closingIssuesReferences: [{ number: 99 }] },
        activeIssues: [{ number: 42, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
      })
    ).toBeNull();

    expect(
      findClaimedIssueForPr({
        pr: { closingIssuesReferences: [] },
        activeIssues: [{ number: 42, state: 'OPEN', labels: [{ name: 'in-progress' }] }],
      })
    ).toBeNull();
  });

  it('fails closed when WIP is ambiguous', () => {
    expect(
      findClaimedIssueForPr({
        pr: { closingIssuesReferences: [{ number: 42 }] },
        activeIssues: [],
      })
    ).toBeNull();

    expect(
      findClaimedIssueForPr({
        pr: { closingIssuesReferences: [{ number: 42 }] },
        activeIssues: [
          { number: 42, state: 'OPEN', labels: [{ name: 'in-progress' }] },
          { number: 43, state: 'OPEN', labels: [{ name: 'in-progress' }] },
        ],
      })
    ).toBeNull();
  });
});
