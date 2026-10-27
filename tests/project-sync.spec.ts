import { describe, expect, it } from 'vitest';
import { bestNextMoveFromComments, classifyIssue, classifyPr, verdictFromComments } from '../scripts/project-sync.mjs';

const HEAD = 'a'.repeat(40);
const issue = (number: number, labels: string[], title = `Issue ${number}`) => ({
  number,
  title,
  labels: labels.map((name) => ({ name })),
});
const pr = (number: number, headRefName: string, extra: Record<string, unknown> = {}) => ({
  number,
  headRefName,
  headRefOid: HEAD,
  isDraft: false,
  labels: [],
  ...extra,
});
const lookups = (verdict: string | null = null, move: string | null = null) => ({ verdict: () => verdict, bestNextMove: () => move });

describe('project-sync verdicts', () => {
  it('reads only final reports for the current head', () => {
    const report = (head: string, verdict: string) => ({
      body: `<!-- evaluator-head: ${head} -->\n\n## Evaluator verdict\n\n${verdict} — x`,
    });
    expect(verdictFromComments([report(HEAD, 'FAIL'), report(HEAD, 'PASS')], HEAD)).toBe('PASS');
    expect(verdictFromComments([report('b'.repeat(40), 'PASS')], HEAD)).toBeNull();
    // A review request that quotes the marker is not a report.
    expect(verdictFromComments([{ body: `Please review <!-- evaluator-head: ${HEAD} -->\n## Evaluator verdict PASS` }], HEAD)).toBeNull();
  });

  it('extracts the newest Best next move line', () => {
    const list = [
      { body: '## Blocked\n**Best next move:** old' },
      { body: '## Blocked\n**Best next move:** merge #768, then remove `blocked`' },
    ];
    expect(bestNextMoveFromComments(list)).toBe('merge #768, then remove `blocked`');
    expect(bestNextMoveFromComments([{ body: 'no blocker here' }])).toBeNull();
  });
});

describe('project-sync routing', () => {
  it('puts a PASS on the current head in front of Vlad to merge', () => {
    expect(classifyPr(pr(824, 'claude/issue-823'), new Set(['agent:claude']), lookups('PASS'))).toMatchObject({
      status: 'Needs you: merge',
      lane: 'Vlad',
    });
  });

  it('routes an unreviewed PR to the opposite builder', () => {
    expect(classifyPr(pr(1, 'claude/issue-1'), new Set(), lookups())).toMatchObject({ status: 'In review', lane: 'Codex' });
    expect(classifyPr(pr(2, 'codex/2-fix'), new Set(), lookups())).toMatchObject({ status: 'In review', lane: 'Claude' });
    expect(classifyPr(pr(3, 'claude/issue-3'), new Set(), lookups('FAIL'))).toMatchObject({ status: 'In review', lane: 'Claude' });
  });

  it('shows blocked issues with their Best next move, even with an open PR', () => {
    expect(
      classifyIssue(issue(759, ['blocked', 'in-progress', 'agent:claude']), pr(768, 'claude/issue-759'), lookups('PASS', 'merge #768')),
    ).toEqual({
      status: 'Needs you: unblock',
      lane: 'Vlad',
      next: 'merge #768',
    });
  });

  it('separates ready-for-human without a PR from a PASS waiting to merge', () => {
    expect(classifyIssue(issue(764, ['ready-for-human', 'agent:claude']), undefined, lookups())).toMatchObject({
      status: 'Needs you: do or hand off',
      next: expect.stringContaining('Claude builds it'),
    });
    expect(
      classifyIssue(issue(823, ['ready-for-human', 'in-progress', 'agent:claude-self']), pr(824, 'claude/issue-823'), lookups('PASS')),
    ).toMatchObject({
      status: 'Needs you: merge',
    });
  });

  it('sends triage, inboxes, epics and buildable work to the right column', () => {
    expect(classifyIssue(issue(825, ['needs-triage']), undefined, lookups())).toMatchObject({ status: 'Needs you: triage' });
    expect(classifyIssue(issue(819, [], 'Learnings inbox: 2026-W44'), undefined, lookups())).toMatchObject({ status: 'Needs you: triage' });
    expect(classifyIssue(issue(631, ['epic']), undefined, lookups())).toMatchObject({ status: 'Backlog' });
    expect(classifyIssue(issue(816, ['in-progress']), undefined, lookups())).toMatchObject({ status: 'Agents building', lane: 'Codex' });
    expect(classifyIssue(issue(808, ['ready-for-agent']), undefined, lookups())).toMatchObject({ status: 'Agent queue', lane: 'Codex' });
    expect(classifyIssue(issue(764, ['agent:claude']), undefined, lookups())).toMatchObject({ status: 'Agent queue', lane: 'Claude' });
  });
});
