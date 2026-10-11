import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  BOT_LOGIN,
  QUEUE_ISSUE_TITLE,
  alreadyNotified,
  assessChecks,
  assessReadiness,
  claudeQueueState,
  closingIssueNumbers,
  createClient,
  handleEvent,
  hasChangesRequested,
  hasClaudeCoauthor,
  hasCurrentSkipRecord,
  isClaudeBuilt,
  issueFingerprint,
  latestEvaluatorVerdict,
  marker,
  parseDependencies,
  parseFactoryConfig,
  protectedFilesTouched,
} from '../scripts/owner-attention.mjs';

const HEAD = '0c0c9be5a1aa4b77afe25a7bc43fed68367381cc';
const greenRuns = [
  { name: 'verify', status: 'completed', conclusion: 'success' },
  { name: 'check', status: 'completed', conclusion: 'success' },
];
const openPr = { state: 'open', draft: false, mergeable: true, mergeable_state: 'clean', head: { sha: HEAD } };
const label = (name: string) => ({ name });

describe('factory config', () => {
  it('reads protected paths, never_claim labels and the routine mode from the real factory file', async () => {
    const config = parseFactoryConfig(await readFile('.factory/factory.yaml', 'utf8'));

    expect(config.mode).toMatch(/^(build|review-only)$/);
    expect(config.neverClaim).toEqual(expect.arrayContaining(['epic', 'blocked', 'area:payments', 'needs-triage']));
    expect(config.protectedPaths).toEqual(
      expect.arrayContaining([
        { group: 'factory', pattern: 'docs/agents/**' },
        { group: 'factory', pattern: 'AGENTS.md' },
        { group: 'payments', pattern: 'server/api/payments/**' },
      ]),
    );
  });

  it('matches changed files against protected globs, including renames out of a protected path', async () => {
    const { protectedPaths } = parseFactoryConfig(await readFile('.factory/factory.yaml', 'utf8'));
    const touched = protectedFilesTouched(
      [
        { filename: 'docs/agents/verification.md' },
        { filename: 'app/components/Foo.vue' },
        { filename: 'notes/moved.md', previous_filename: 'AGENTS.md' },
        { filename: 'server/api/payments/intent.post.ts' },
        { filename: 'docs/agents-notes.md' },
      ],
      protectedPaths,
    );

    expect(touched).toEqual([
      { file: 'docs/agents/verification.md', group: 'factory' },
      { file: 'notes/moved.md', group: 'factory' },
      { file: 'server/api/payments/intent.post.ts', group: 'payments' },
    ]);
  });
});

describe('evaluator verdict', () => {
  const trusted = { trustedLogins: ['caraseli02'] };
  const report = (sha: string, verdict: string, extra: Record<string, unknown> = {}) => ({
    user: { login: 'caraseli02' },
    body: `<!-- evaluator-head: ${sha} -->\n## Evaluator verdict\n\n${verdict}\n\nIndependent evaluator: Codex. Evaluated exact PR head \`${sha}\`.`,
    ...extra,
  });

  it('takes the newest attributed report for the exact head only', () => {
    const comments = [
      report('deadbeef', 'FAIL — needs generator fix.', { html_url: 'u1' }),
      report(HEAD, '**PASS — ready-for-human.** details', { html_url: 'u2' }),
      report('deadbeef', 'PASS — ready-for-human.', { html_url: 'u3' }),
      report(HEAD, 'PASS — ready-for-human (restated).', { html_url: 'u4' }),
    ];

    expect(latestEvaluatorVerdict(comments, HEAD, trusted)).toEqual({ verdict: 'PASS', url: 'u4' });
  });

  it('treats contradictory reports for the same head as ambiguous instead of taking the newest', () => {
    const comments = [
      report(HEAD, 'FAIL — needs generator fix.', { html_url: 'u1' }),
      report(HEAD, 'PASS — ready-for-human.', { html_url: 'u2' }),
    ];
    const verdict = latestEvaluatorVerdict(comments, HEAD, trusted);

    expect(verdict).toMatchObject({ verdict: 'CONFLICTING', url: 'u2', verdicts: ['FAIL', 'PASS'] });
    const result = assessReadiness({ pr: openPr, checks: assessChecks(greenRuns, { statuses: [] }), verdict, reviews: [] });
    expect(result.ready).toBe(false);
    expect(result.reasons).toEqual(['contradictory evaluator reports for the current head (FAIL, PASS) need clarification']);
  });

  it('ignores comments that only quote the marker or lack the verdict heading', () => {
    const comments = [
      { ...report(HEAD, 'PASS'), body: `Please review. ${report(HEAD, 'PASS').body}` },
      { user: { login: 'caraseli02' }, body: `<!-- evaluator-head: ${HEAD} -->\nPASS without heading\nIndependent evaluator: Codex.` },
      {
        user: { login: 'caraseli02' },
        body: `<!-- evaluator-inconclusive: ${HEAD} -->\n## Evaluator verdict\n\nINCONCLUSIVE\nIndependent evaluator: Codex.`,
      },
    ];

    expect(latestEvaluatorVerdict(comments, HEAD, trusted)).toBeNull();
  });

  it('rejects spoofed and unattributed reports', () => {
    const outsider = report(HEAD, 'PASS — ready-for-human.', { user: { login: 'drive-by' } });
    const unattributed = {
      user: { login: 'caraseli02' },
      body: `<!-- evaluator-head: ${HEAD} -->\n## Evaluator verdict\n\nPASS — ready-for-human.`,
    };

    const emptyAttribution = { ...unattributed, body: `${unattributed.body}\n\nIndependent evaluator:\n` };
    const proseMention = { ...unattributed, body: `${unattributed.body}\n\nThe independent evaluator: TBD` };
    const botEcho = report(HEAD, 'PASS — ready-for-human.', { user: { login: BOT_LOGIN } });

    expect(latestEvaluatorVerdict([outsider], HEAD, trusted)).toBeNull();
    expect(latestEvaluatorVerdict([unattributed], HEAD, trusted)).toBeNull();
    expect(latestEvaluatorVerdict([emptyAttribution], HEAD, trusted)).toBeNull();
    expect(latestEvaluatorVerdict([proseMention], HEAD, trusted)).toBeNull();
    expect(latestEvaluatorVerdict([botEcho], HEAD, { trustedLogins: ['caraseli02', BOT_LOGIN] })).toBeNull();
    expect(latestEvaluatorVerdict([report(HEAD, 'FAIL'), outsider], HEAD, trusted)?.verdict).toBe('FAIL');
  });

  it('accepts the legacy local-evaluator marker and bold attribution', () => {
    const comments = [
      {
        user: { login: 'caraseli02' },
        body: `<!-- local-evaluator sha=${HEAD} -->\n## Evaluator verdict\n\nBLOCKED — needs human decision\n\n**Independent evaluator:** Claude.`,
      },
    ];

    expect(latestEvaluatorVerdict(comments, HEAD, trusted)?.verdict).toBe('BLOCKED');
  });
});

describe('readiness', () => {
  const pass = { verdict: 'PASS', url: 'u' };

  it('is ready when CI is green, the exact head passed, it is mergeable and nobody requested changes', () => {
    const checks = assessChecks(greenRuns, { statuses: [{ context: 'Vercel', state: 'success' }] });

    expect(assessReadiness({ pr: openPr, checks, verdict: pass, reviews: [] })).toEqual({ ready: true, reasons: [] });
  });

  it('ignores its own check run so it cannot block itself', () => {
    const checks = assessChecks([...greenRuns, { name: 'owner-attention', status: 'in_progress', conclusion: null }], { statuses: [] });

    expect(checks.state).toBe('success');
  });

  it('judges only the newest run per check name, so a superseded cancelled run does not block', () => {
    const runs = [
      { id: 3, name: 'check', status: 'completed', conclusion: 'success' },
      { id: 1, name: 'check', status: 'completed', conclusion: 'cancelled' },
      { id: 2, name: 'verify', status: 'completed', conclusion: 'success' },
    ];

    expect(assessChecks(runs, { statuses: [] }).state).toBe('success');
    expect(assessChecks([...runs, { id: 4, name: 'check', status: 'completed', conclusion: 'failure' }], { statuses: [] }).failing).toEqual(
      ['check'],
    );
  });

  it('is not ready without a reported verify run, or with failing or pending checks', () => {
    expect(assessChecks([{ name: 'check', status: 'completed', conclusion: 'success' }], { statuses: [] }).state).toBe('pending');
    expect(assessChecks([{ name: 'verify', status: 'completed', conclusion: 'failure' }], { statuses: [] }).state).toBe('failure');
    expect(assessChecks(greenRuns, { statuses: [{ context: 'Vercel', state: 'pending' }] }).state).toBe('pending');
  });

  it('lists every reason a PR is not ready', () => {
    const checks = assessChecks(greenRuns, { statuses: [] });
    const result = assessReadiness({
      pr: { ...openPr, mergeable: false, mergeable_state: 'dirty' },
      checks,
      verdict: { verdict: 'FAIL' },
      reviews: [{ user: { login: 'r' }, state: 'CHANGES_REQUESTED' }],
    });

    expect(result.ready).toBe(false);
    expect(result.reasons).toEqual(['merge conflict', 'evaluator verdict is FAIL', 'changes requested by a reviewer']);
  });

  it('waits while GitHub has not computed mergeability', () => {
    const checks = assessChecks(greenRuns, { statuses: [] });

    expect(assessReadiness({ pr: { ...openPr, mergeable: null }, checks, verdict: pass, reviews: [] }).reasons).toEqual([
      'mergeability not computed yet',
    ]);
  });

  it('clears a change request once the same reviewer approves', () => {
    expect(
      hasChangesRequested([
        { user: { login: 'r' }, state: 'CHANGES_REQUESTED' },
        { user: { login: 'r' }, state: 'COMMENTED' },
        { user: { login: 'r' }, state: 'APPROVED' },
      ]),
    ).toBe(false);
  });
});

describe('notification dedupe', () => {
  it('only counts markers posted by the bot', () => {
    const key = `ready:${HEAD}`;

    expect(alreadyNotified([{ user: { login: 'caraseli02' }, body: marker(key) }], key)).toBe(false);
    expect(alreadyNotified([{ user: { login: BOT_LOGIN }, body: `${marker(key)}\nhello` }], key)).toBe(true);
    expect(alreadyNotified([{ user: { login: BOT_LOGIN }, body: marker('ready:other') }], key)).toBe(false);
  });
});

describe('Claude provenance', () => {
  it('recognises the label, branch prefix and body signature without extra calls', () => {
    expect(isClaudeBuilt({ labels: [label('agent:claude')], head: { ref: 'x' } })).toBe(true);
    expect(isClaudeBuilt({ labels: [], head: { ref: 'claude/issue-1' } })).toBe(true);
    expect(
      isClaudeBuilt({ labels: [], head: { ref: 'fix/x' }, body: '🤖 Generated with [Claude Code](https://claude.com/claude-code)' }),
    ).toBe(true);
    expect(isClaudeBuilt({ labels: [], head: { ref: 'codex/456' }, body: 'Closes #456' })).toBe(false);
  });

  it('reads closing keywords and Claude co-author trailers', () => {
    expect(closingIssueNumbers('Closes #632\nRelated #631\nfixes: #7 and Resolved #8')).toEqual([632, 7, 8]);
    expect(hasClaudeCoauthor([{ commit: { message: 'fix: x\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>' } }])).toBe(true);
    expect(hasClaudeCoauthor([{ commit: { message: 'fix: x\n\nCo-Authored-By: Someone <a@b.c>' } }])).toBe(false);
  });
});

describe('recorded skips', () => {
  const trusted = { trustedLogins: ['caraseli02'] };
  const issue = { number: 651, title: 'close-out', body: 'After every other child of #631 is closed.', labels: [label('agent:claude')] };
  const skip = (forIssue: object, login = 'caraseli02', id = 1) => ({
    id,
    user: { login },
    body: `<!-- claude-skip v=${issueFingerprint(forIssue)} -->\nWaits on every other child of #631.`,
  });

  it('fingerprints title, body and label set, ignoring label order and line endings', () => {
    const reordered = { ...issue, body: issue.body.replace(/\n/g, '\r\n'), labels: [label('b'), label('a')] };
    expect(issueFingerprint(reordered)).toBe(issueFingerprint({ ...reordered, labels: [label('a'), label('b')] }));
    expect(issueFingerprint(issue)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('holds while the skip is the newest comment and the issue is unchanged', () => {
    expect(hasCurrentSkipRecord(issue, [skip(issue)], trusted)).toBe(true);
  });

  it('lapses when anyone comments after the skip, however soon', () => {
    const ready = { id: 2, user: { login: 'caraseli02' }, body: 'Ready now.' };
    expect(hasCurrentSkipRecord(issue, [skip(issue), ready], trusted)).toBe(false);
    // Order comes from comment ids, not timestamps or response order.
    expect(hasCurrentSkipRecord(issue, [ready, skip(issue)], trusted)).toBe(false);
  });

  it('lapses on a body or title edit, even within the same second (evaluator reproduction)', () => {
    expect(hasCurrentSkipRecord({ ...issue, body: 'Dependency dropped.' }, [skip(issue)], trusted)).toBe(false);
    expect(hasCurrentSkipRecord({ ...issue, title: 'close-out (ready)' }, [skip(issue)], trusted)).toBe(false);
  });

  it('lapses on a label change, even in the same second as the skip (evaluator reproduction)', () => {
    expect(hasCurrentSkipRecord({ ...issue, labels: [...issue.labels, label('priority:p1')] }, [skip(issue)], trusted)).toBe(false);
  });

  it('rejects untrusted, bot and fingerprint-less skip comments', () => {
    expect(hasCurrentSkipRecord(issue, [skip(issue, 'drive-by')], trusted)).toBe(false);
    expect(hasCurrentSkipRecord(issue, [skip(issue, BOT_LOGIN)], { trustedLogins: ['caraseli02', BOT_LOGIN] })).toBe(false);
    expect(hasCurrentSkipRecord(issue, [{ id: 1, user: { login: 'caraseli02' }, body: '<!-- claude-skip -->\nold format' }], trusted)).toBe(
      false,
    );
  });

  it('removes skipped and natively blocked issues from the eligible queue', () => {
    const neverClaim = ['blocked'];
    const issues = [
      { number: 651, title: 'a', labels: [label('agent:claude')], assignees: [], body: '' },
      { number: 652, title: 'b', labels: [label('agent:claude')], assignees: [], body: '', issue_dependencies_summary: { blocked_by: 1 } },
    ];
    const state = claudeQueueState(issues, { neverClaim, openIssueNumbers: new Set([651, 652]), skippedNumbers: new Set([651]) });

    expect(state.eligible).toEqual([]);
    expect(state.idle).toBe(true);
  });
});

describe('Claude build queue', () => {
  const neverClaim = ['epic', 'blocked', 'area:payments', 'needs-triage', 'needs-info', 'ready-for-human'];
  const issue = (number: number, labels: string[], extra: Record<string, unknown> = {}) => ({
    number,
    title: `Issue ${number}`,
    labels: labels.map(label),
    assignees: [],
    body: '',
    ...extra,
  });

  it('treats agent:claude alone as eligible, without ready-for-agent', () => {
    const state = claudeQueueState([issue(1, ['agent:claude', 'enhancement'])], { neverClaim, openIssueNumbers: new Set([1]) });

    expect(state.eligible.map((entry) => entry.number)).toEqual([1]);
    expect(state.idle).toBe(false);
  });

  it('is idle when every Claude issue is claimed elsewhere, excluded or waiting on an open dependency', () => {
    const issues = [
      issue(1, ['agent:claude', 'in-progress', 'blocked']),
      issue(2, ['agent:claude', 'needs-triage']),
      issue(3, ['agent:claude'], { assignees: [{ login: 'someone' }] }),
      issue(4, ['agent:claude'], { title: 'Payments: refunds' }),
      issue(5, ['agent:claude'], { body: 'Scope...\n\nDepends on #9\n' }),
      issue(6, ['ready-for-agent']),
      issue(7, ['agent:claude'], { pull_request: {} }),
    ];
    const state = claudeQueueState(issues, { neverClaim, openIssueNumbers: new Set([1, 2, 3, 4, 5, 6, 9]) });

    expect(state.live).toEqual([]);
    expect(state.eligible).toEqual([]);
    expect(state.idle).toBe(true);
  });

  it('is busy while Claude has a live in-progress issue, and frees a dependency once it closes', () => {
    const live = claudeQueueState([issue(1, ['agent:claude', 'in-progress'])], { neverClaim, openIssueNumbers: new Set([1]) });
    const unblocked = claudeQueueState([issue(5, ['agent:claude'], { body: '- **Depends on:** #9, #10' })], {
      neverClaim,
      openIssueNumbers: new Set([5]),
    });

    expect(live.idle).toBe(false);
    expect(unblocked.eligible.map((entry) => entry.number)).toEqual([5]);
  });

  it('removes issues an open PR already closes or that have a claude/issue-<n> branch', () => {
    const state = claudeQueueState([issue(1, ['agent:claude']), issue(2, ['agent:claude']), issue(3, ['agent:claude'])], {
      neverClaim,
      openIssueNumbers: new Set([1, 2, 3]),
      claimedNumbers: new Set([1, 2]),
    });

    expect(state.eligible.map((entry) => entry.number)).toEqual([3]);
  });

  it('parses Depends on / Blocked by lines only', () => {
    expect(parseDependencies('Related #631\nDepends on #632 and #633\n> Blocked by: #7\nSee #8')).toEqual([632, 633, 7]);
  });
});

describe('owner attention workflow', () => {
  it('runs the trusted default-branch script with write access only to issues and PRs', async () => {
    const workflow = await readFile('.github/workflows/owner-attention.yml', 'utf8');

    expect(workflow).toContain('pull_request_target');
    expect(workflow).toContain('workflow_run');
    expect(workflow).toContain('schedule');
    expect(workflow).toContain('ref: ${{ github.event.repository.default_branch }}');
    expect(workflow).toContain('node scripts/owner-attention.mjs');
    expect(workflow).not.toContain('github.event.pull_request.head');
    expect(workflow).not.toMatch(/contents:\s*write/);
    // Runs never overlap, so dedupe reads and writes cannot race.
    expect(workflow).toMatch(/concurrency:\s*\n\s*group: owner-attention\s*\n\s*cancel-in-progress: false/);
  });
});

describe('reconcile against a fake GitHub API', () => {
  type Call = { method: string; path: string; body?: { body?: string; title?: string; state?: string } };
  type Routes = Record<string, unknown>;

  // Stateful fake: posted comments and issues become visible to later reads,
  // so repeated or back-to-back runs exercise the real dedupe path.
  function fakeGitHub(routes: Routes) {
    const calls: Call[] = [];
    const fetchImpl = async (url: string, init: { method: string; body?: string }) => {
      const path = url.replace('https://api.github.com/repos/o/r', '').replace(/[?&]per_page=100$/, '');
      const body = init.body ? JSON.parse(init.body) : undefined;
      calls.push({ method: init.method, path, body });
      if (init.method === 'POST' && path.endsWith('/comments')) {
        const list = (routes[path] as unknown[] | undefined) ?? [];
        routes[path] = [...list, { user: { login: BOT_LOGIN }, body: body.body }];
      } else if (init.method === 'POST' && path === '/issues') {
        const list = (routes['/issues?state=open'] as unknown[] | undefined) ?? [];
        routes['/issues?state=open'] = [...list, { number: 99, title: body.title, user: { login: BOT_LOGIN }, labels: [], assignees: [] }];
      }
      // Repositories without claude/issue-* branches return an empty ref list.
      const fallback = path === '/git/matching-refs/heads/claude/issue-' ? [] : undefined;
      const data = init.method === 'GET' ? (routes[path] ?? fallback) : { number: 99 };
      if (data === undefined) return new Response('not found', { status: 404 });
      return new Response(JSON.stringify(data), { status: 200 });
    };
    return { gh: createClient({ repository: 'o/r', token: 't', fetchImpl }), calls };
  }

  const owner = 'caraseli02';
  const config = {
    protectedPaths: [{ group: 'factory', pattern: 'docs/agents/**' }],
    neverClaim: ['blocked', 'needs-triage'],
    mode: 'build',
  };
  const busyIssue = { number: 3, title: 'live', state: 'open', labels: [label('agent:claude'), label('in-progress')], assignees: [] };
  const pr = { number: 658, ...openPr, labels: [label('agent:claude')], head: { sha: HEAD, ref: 'claude/issue-632' } };
  const passComment = {
    user: { login: 'caraseli02' },
    body: `<!-- evaluator-head: ${HEAD} -->\n## Evaluator verdict\n\nPASS — ready-for-human.\n\nIndependent evaluator: Codex.`,
    html_url: 'pass',
  };
  const readyRoutes = (comments: unknown[]): Routes => ({
    '/pulls?state=open': [pr],
    '/pulls/658': pr,
    '/pulls/658/files': [],
    '/issues/658/comments': comments,
    [`/commits/${HEAD}/check-runs`]: { check_runs: greenRuns },
    [`/commits/${HEAD}/status`]: { statuses: [] },
    '/pulls/658/reviews': [],
    '/issues?state=open': [busyIssue],
  });
  const posts = (calls: Call[]) => calls.filter((call) => call.method === 'POST');

  it('mentions the owner once when the evaluator PASS lands on a green, mergeable head', async () => {
    const { gh, calls } = fakeGitHub(readyRoutes([passComment]));
    await handleEvent({ eventName: 'issue_comment', gh, owner, config });

    expect(posts(calls)).toHaveLength(1);
    expect(posts(calls)[0].path).toBe('/issues/658/comments');
    expect(posts(calls)[0].body?.body).toContain('@caraseli02');
    expect(posts(calls)[0].body?.body).toContain(marker(`ready:${HEAD}`));
  });

  it('posts each notice once across back-to-back runs triggered by different events', async () => {
    const routes = readyRoutes([passComment]);
    routes['/issues?state=open'] = [];
    const { gh, calls } = fakeGitHub(routes);
    for (const eventName of ['issue_comment', 'workflow_run', 'schedule', 'issues']) await handleEvent({ eventName, gh, owner, config });

    expect(posts(calls).filter((call) => call.path === '/issues/658/comments')).toHaveLength(1);
    expect(posts(calls).filter((call) => call.path === '/issues')).toHaveLength(1);
  });

  it('does not claim merge-ready while same-head evaluator reports contradict each other', async () => {
    const fail = { ...passComment, body: passComment.body.replace('PASS — ready-for-human.', 'FAIL — needs generator fix.') };
    const { gh, calls } = fakeGitHub(readyRoutes([fail, passComment]));
    await handleEvent({ eventName: 'issue_comment', gh, owner, config });

    expect(posts(calls)).toEqual([]);
  });

  it('does not treat an outsider look-alike PASS as merge-ready', async () => {
    const { gh, calls } = fakeGitHub(readyRoutes([{ ...passComment, user: { login: 'drive-by' } }]));
    await handleEvent({ eventName: 'issue_comment', gh, owner, config });

    expect(posts(calls)).toEqual([]);
  });

  it('flags an unlabeled interactive Claude PR (body signature only) that touches payment paths', async () => {
    const interactive = {
      ...pr,
      labels: [],
      head: { ...pr.head, ref: 'fix/checkout' },
      body: '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
    };
    const { gh, calls } = fakeGitHub({
      ...readyRoutes([]),
      '/pulls?state=open': [interactive],
      '/pulls/658': interactive,
      '/pulls/658/files': [{ filename: 'server/api/payments/intent.post.ts' }],
    });
    await handleEvent({
      eventName: 'pull_request_target',
      gh,
      owner,
      config: { ...config, protectedPaths: [...config.protectedPaths, { group: 'payments', pattern: 'server/api/payments/**' }] },
    });

    expect(posts(calls)).toHaveLength(1);
    expect(posts(calls)[0].body?.body).toContain('payment paths');
  });

  it('flags a PR whose only Claude signal is a linked agent:claude issue or a co-author trailer', async () => {
    const plain = { ...pr, labels: [], head: { ...pr.head, ref: 'fix/x' }, body: 'Closes #632' };
    const base = {
      ...readyRoutes([]),
      '/pulls?state=open': [plain],
      '/pulls/658': plain,
      '/pulls/658/files': [{ filename: 'docs/agents/verification.md' }],
    };

    const linked = fakeGitHub({ ...base, '/issues/632': { number: 632, labels: [label('agent:claude')] }, '/pulls/658/commits': [] });
    await handleEvent({ eventName: 'pull_request_target', gh: linked.gh, owner, config });
    expect(posts(linked.calls)).toHaveLength(1);

    const coauthored = fakeGitHub({
      ...base,
      '/issues/632': { number: 632, labels: [] },
      '/pulls/658/commits': [{ commit: { message: 'docs: x\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>' } }],
    });
    await handleEvent({ eventName: 'pull_request_target', gh: coauthored.gh, owner, config });
    expect(posts(coauthored.calls)).toHaveLength(1);
  });

  it('leaves non-Claude PRs that touch protected paths alone', async () => {
    const codex = { ...pr, labels: [], head: { ...pr.head, ref: 'codex/456' }, body: 'Closes #456' };
    const { gh, calls } = fakeGitHub({
      ...readyRoutes([]),
      '/pulls?state=open': [codex],
      '/pulls/658': codex,
      '/pulls/658/files': [{ filename: 'docs/agents/verification.md' }],
      '/issues/456': { number: 456, labels: [] },
      '/pulls/658/commits': [{ commit: { message: 'feat: isr' } }],
    });
    await handleEvent({ eventName: 'pull_request_target', gh, owner, config });

    expect(posts(calls)).toEqual([]);
  });

  it('flags a Claude PR that touches protected paths without owner-approved-harness', async () => {
    const { gh, calls } = fakeGitHub({ ...readyRoutes([]), '/pulls/658/files': [{ filename: 'docs/agents/verification.md' }] });
    await handleEvent({ eventName: 'pull_request_target', gh, owner, config });

    expect(posts(calls)).toHaveLength(1);
    expect(posts(calls)[0].body?.body).toContain('owner-approved-harness');
    expect(posts(calls)[0].body?.body).toContain('docs/agents/verification.md');
  });

  it('points the owner at the blocker note while an issue is blocked', async () => {
    const blocked = {
      number: 632,
      state: 'open',
      title: 'x',
      labels: [label('agent:claude'), label('in-progress'), label('blocked')],
      assignees: [],
    };
    const { gh, calls } = fakeGitHub({
      '/pulls?state=open': [],
      '/issues?state=open': [blocked, busyIssue],
      '/issues/632/comments': [{ user: { login: 'caraseli02' }, body: '## Blocked\n\n- Issue: #632', html_url: 'blocker-url' }],
      '/issues/3/comments': [],
    });
    await handleEvent({ eventName: 'issues', gh, owner, config });

    const post = calls.find((call) => call.method === 'POST' && call.path === '/issues/632/comments');
    expect(post?.body?.body).toContain('blocker-url');
    expect(post?.body?.body).toContain('remove `blocked`');
  });

  it('sends nothing when blocked is removed, even though the event names the blocked label', async () => {
    const unblocked = { number: 632, state: 'open', title: 'x', labels: [label('agent:claude'), label('in-progress')], assignees: [] };
    const { gh, calls } = fakeGitHub({
      '/pulls?state=open': [],
      '/issues?state=open': [unblocked],
      '/issues/632/comments': [{ user: { login: 'caraseli02' }, body: '## Blocked\n\n- Issue: #632', html_url: 'blocker-url' }],
    });
    await handleEvent({ eventName: 'issues', gh, owner, config });

    expect(posts(calls)).toEqual([]);
  });

  it('reports an idle queue when every label-eligible issue carries a current skip record', async () => {
    const skipped = {
      number: 651,
      state: 'open',
      title: 'close-out',
      labels: [label('agent:claude')],
      assignees: [],
      body: 'After every other child of #631 is closed.',
      updated_at: '2026-10-11T10:00:30Z',
    };
    const { gh, calls } = fakeGitHub({
      '/pulls?state=open': [],
      '/issues?state=open': [skipped],
      '/issues/651/comments': [
        {
          id: 9,
          user: { login: 'caraseli02' },
          body: `<!-- claude-skip v=${issueFingerprint(skipped)} -->\nWaits on #631 children; edits docs/agents/**.`,
        },
      ],
    });
    await handleEvent({ eventName: 'schedule', gh, owner, config });

    expect(posts(calls).filter((call) => call.path === '/issues')).toHaveLength(1);
  });

  it('closes the empty-queue alert once the owner comments on or edits a skipped issue', async () => {
    const skippedAs = {
      number: 651,
      state: 'open',
      title: 'close-out',
      labels: [label('agent:claude')],
      assignees: [],
      body: 'After #631.',
    };
    const tracking = { number: 50, state: 'open', title: QUEUE_ISSUE_TITLE, user: { login: BOT_LOGIN }, labels: [], assignees: [] };
    const record = { id: 9, user: { login: 'caraseli02' }, body: `<!-- claude-skip v=${issueFingerprint(skippedAs)} -->\nWaits on #631.` };

    const commented = fakeGitHub({
      '/pulls?state=open': [],
      '/issues?state=open': [skippedAs, tracking],
      '/issues/651/comments': [record, { id: 10, user: { login: 'caraseli02' }, body: 'Dependency dropped. Ready now.' }],
    });
    await handleEvent({ eventName: 'schedule', gh: commented.gh, owner, config });
    expect(commented.calls.find((call) => call.method === 'PATCH')).toMatchObject({ path: '/issues/50', body: { state: 'closed' } });

    // A body correction two seconds after the skip leaves no new comment, only a changed issue.
    const edited = fakeGitHub({
      '/pulls?state=open': [],
      '/issues?state=open': [{ ...skippedAs, body: 'No dependency any more.' }, tracking],
      '/issues/651/comments': [record],
    });
    await handleEvent({ eventName: 'schedule', gh: edited.gh, owner, config });
    expect(edited.calls.find((call) => call.method === 'PATCH')).toMatchObject({ path: '/issues/50', body: { state: 'closed' } });
  });

  it('reports an idle queue when the only candidates already have an open PR or a claude/issue-<n> branch', async () => {
    const candidate = (number: number) => ({
      number,
      state: 'open',
      title: `c${number}`,
      body: '',
      labels: [label('agent:claude')],
      assignees: [],
    });
    const routes = (refs: unknown[]): Routes => ({
      '/pulls?state=open': [{ number: 800, state: 'open', draft: true, body: 'Closes #64' }],
      '/issues?state=open': [candidate(63), candidate(64)],
      '/git/matching-refs/heads/claude/issue-': refs,
      '/issues/63/comments': [],
    });

    const claimed = fakeGitHub(routes([{ ref: 'refs/heads/claude/issue-63' }]));
    await handleEvent({ eventName: 'schedule', gh: claimed.gh, owner, config });
    expect(posts(claimed.calls).filter((call) => call.path === '/issues')).toHaveLength(1);

    // A run-local branch alone is not a claim, so #63 is still buildable.
    const runLocal = fakeGitHub(routes([{ ref: 'refs/heads/claude/issue-63-run-20261011T100000Z' }]));
    await handleEvent({ eventName: 'schedule', gh: runLocal.gh, owner, config });
    expect(posts(runLocal.calls).filter((call) => call.path === '/issues')).toEqual([]);
  });

  it('opens one queue issue when Claude is idle and closes it when work appears', async () => {
    const idle = fakeGitHub({
      '/pulls?state=open': [],
      '/issues?state=open': [
        { number: 2, state: 'open', title: 't', labels: [label('agent:claude'), label('needs-triage')], assignees: [] },
      ],
    });
    await handleEvent({ eventName: 'schedule', gh: idle.gh, owner, config });
    await handleEvent({ eventName: 'issues', gh: idle.gh, owner, config });
    expect(idle.calls.filter((call) => call.method === 'POST' && call.path === '/issues')).toHaveLength(1);
    expect(idle.calls.find((call) => call.method === 'POST' && call.path === '/issues')?.body?.title).toBe(QUEUE_ISSUE_TITLE);

    const busy = fakeGitHub({
      '/pulls?state=open': [],
      '/issues?state=open': [
        { number: 3, state: 'open', title: 'next', labels: [label('agent:claude')], assignees: [] },
        { number: 50, state: 'open', title: QUEUE_ISSUE_TITLE, user: { login: BOT_LOGIN }, labels: [], assignees: [] },
      ],
      '/issues/3/comments': [],
    });
    await handleEvent({ eventName: 'schedule', gh: busy.gh, owner, config });
    expect(busy.calls.find((call) => call.method === 'PATCH')).toMatchObject({ path: '/issues/50', body: { state: 'closed' } });
  });
});
