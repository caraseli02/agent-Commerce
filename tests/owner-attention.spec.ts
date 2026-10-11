import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  BOT_LOGIN,
  QUEUE_ISSUE_TITLE,
  SKIP_MARKER,
  alreadyNotified,
  assessChecks,
  assessReadiness,
  claudeProvenance,
  claudeQueueState,
  closingIssueNumbers,
  createClient,
  handleEvent,
  hasChangesRequested,
  hasCurrentSkip,
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

  it('excludes native blocked-by, linked open PRs, existing branches and recorded skips', () => {
    const issues = [
      issue(1, ['agent:claude'], { issue_dependencies_summary: { blocked_by: 1, total_blocked_by: 1 } }),
      issue(2, ['agent:claude']),
      issue(3, ['agent:claude']),
      issue(4, ['agent:claude'], { issue_dependencies_summary: { blocked_by: 0, total_blocked_by: 2 } }),
    ];
    const state = claudeQueueState(issues, {
      neverClaim,
      openIssueNumbers: new Set([1, 2, 3, 4]),
      claimedNumbers: new Set([2]),
      skipped: new Set([3]),
    });

    expect(state.candidates.map((entry) => entry.number)).toEqual([3, 4]);
    expect(state.eligible.map((entry) => entry.number)).toEqual([4]);
  });

  it('counts a routine skip only while it is the latest change and from a trusted account', () => {
    const skip = {
      user: { login: 'caraseli02' },
      body: `${SKIP_MARKER}\nSkipped: waits on #651 in prose.`,
      created_at: '2026-10-11T10:00:00Z',
    };
    const trustedLogins = ['caraseli02'];

    expect(hasCurrentSkip({ updated_at: '2026-10-11T10:00:01Z' }, [skip], { trustedLogins })).toBe(true);
    expect(hasCurrentSkip({ updated_at: '2026-10-11T12:00:00Z' }, [skip], { trustedLogins })).toBe(false);
    expect(hasCurrentSkip({ updated_at: '2026-10-11T10:00:01Z' }, [{ ...skip, user: { login: 'drive-by' } }], { trustedLogins })).toBe(
      false,
    );
    expect(hasCurrentSkip({ updated_at: '2026-10-11T10:00:01Z' }, [{ ...skip, body: `Quoting ${SKIP_MARKER}` }], { trustedLogins })).toBe(
      false,
    );
  });

  it('parses Depends on / Blocked by lines only', () => {
    expect(parseDependencies('Related #631\nDepends on #632 and #633\n> Blocked by: #7\nSee #8')).toEqual([632, 633, 7]);
  });
});

describe('Claude provenance', () => {
  const base = { labels: [], head: { ref: 'feature/x' }, body: '' };

  it('recognizes every routine signal and nothing for an ordinary PR', () => {
    expect(claudeProvenance({ pr: base })).toEqual([]);
    expect(claudeProvenance({ pr: { ...base, labels: [label('agent:claude')] } })).toEqual(['agent:claude label']);
    expect(claudeProvenance({ pr: { ...base, head: { ref: 'claude/foo' } } })).toEqual(['claude/ branch']);
    expect(claudeProvenance({ pr: { ...base, body: '🤖 Generated with [Claude Code](https://claude.com/claude-code)' } })).toEqual([
      'Claude Code body signature',
    ]);
    expect(claudeProvenance({ pr: base, linkedIssues: [{ number: 7, labels: [label('agent:claude')] }] })).toEqual([
      'linked agent:claude issue #7',
    ]);
    expect(
      claudeProvenance({
        pr: base,
        commits: [{ commit: { message: 'fix: x\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>' } }],
      }),
    ).toEqual(['Claude co-author trailer']);
  });

  it('reads GitHub closing keywords', () => {
    expect(closingIssueNumbers('Closes #12, fixes #13\nResolved: #14\nRelated #15')).toEqual([12, 13, 14]);
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
      const data =
        init.method === 'GET' ? (routes[path] ?? (path === '/git/matching-refs/heads/claude/issue-' ? [] : undefined)) : { number: 99 };
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
  const paymentPaths = [{ group: 'payments', pattern: 'server/api/payments/**' }];
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

  it('flags a Claude PR that touches protected paths without owner-approved-harness', async () => {
    const { gh, calls } = fakeGitHub({ ...readyRoutes([]), '/pulls/658/files': [{ filename: 'docs/agents/verification.md' }] });
    await handleEvent({ eventName: 'pull_request_target', gh, owner, config });

    expect(posts(calls)).toHaveLength(1);
    expect(posts(calls)[0].body?.body).toContain('owner-approved-harness');
    expect(posts(calls)[0].body?.body).toContain('docs/agents/verification.md');
  });

  it('flags protected and payment paths on an unlabeled Claude PR found only by its body signature', async () => {
    const interactive = {
      number: 700,
      ...openPr,
      labels: [],
      body: 'Change.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)',
      head: { sha: HEAD, ref: 'feature/payments-tweak' },
    };
    const { gh, calls } = fakeGitHub({
      ...readyRoutes([]),
      '/pulls?state=open': [interactive],
      '/pulls/700': interactive,
      '/pulls/700/files': [{ filename: 'server/api/payments/intent.post.ts' }],
      '/issues/700/comments': [],
      '/pulls/700/reviews': [],
    });
    await handleEvent({ eventName: 'pull_request_target', gh, owner, config: { ...config, protectedPaths: paymentPaths } });

    expect(posts(calls)).toHaveLength(1);
    expect(posts(calls)[0].body?.body).toContain('payment paths');
  });

  it('flags a Claude PR found only by a co-author trailer or a linked Claude issue', async () => {
    const plain = { number: 701, ...openPr, labels: [], body: 'Closes #40', head: { sha: HEAD, ref: 'feature/x' } };
    const routes = (extra: Routes): Routes => ({
      ...readyRoutes([]),
      '/pulls?state=open': [plain],
      '/pulls/701': plain,
      '/pulls/701/files': [{ filename: 'docs/agents/verification.md' }],
      '/issues/701/comments': [],
      '/pulls/701/reviews': [],
      '/pulls/701/commits': [{ commit: { message: 'docs: x' } }],
      '/issues/40': { number: 40, labels: [] },
      ...extra,
    });

    const trailer = fakeGitHub(
      routes({ '/pulls/701/commits': [{ commit: { message: 'docs: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>' } }] }),
    );
    await handleEvent({ eventName: 'pull_request_target', gh: trailer.gh, owner, config });
    expect(posts(trailer.calls)).toHaveLength(1);

    const linked = fakeGitHub(routes({ '/issues/40': { number: 40, labels: [label('agent:claude')] } }));
    await handleEvent({ eventName: 'pull_request_target', gh: linked.gh, owner, config });
    expect(posts(linked.calls)).toHaveLength(1);

    const none = fakeGitHub(routes({}));
    await handleEvent({ eventName: 'pull_request_target', gh: none.gh, owner, config });
    expect(posts(none.calls)).toEqual([]);
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

  it('reports an empty queue when every candidate is unbuildable, and not while one is still unjudged', async () => {
    const prose = {
      number: 61,
      state: 'open',
      title: 'Update docs/agents after #651',
      body: 'Work on docs/agents/** once every other child of #651 is closed.',
      labels: [label('agent:claude')],
      assignees: [],
      updated_at: '2026-10-11T10:00:00Z',
    };
    const native = { ...prose, number: 62, issue_dependencies_summary: { blocked_by: 1 } };
    const branched = { ...prose, number: 63 };
    const withPr = { ...prose, number: 64 };
    const openPrForIssue = { number: 800, state: 'open', draft: true, body: 'Closes #64' };
    const skip = {
      user: { login: 'caraseli02' },
      body: `${SKIP_MARKER}\nSkipped: prose dependency on #651 and protected scope docs/agents/**.`,
      created_at: '2026-10-11T10:00:00Z',
    };
    const routes = (comments: unknown[]): Routes => ({
      '/pulls?state=open': [openPrForIssue],
      '/issues?state=open': [
        prose,
        native,
        branched,
        withPr,
        { number: 651, state: 'open', title: 'epic', labels: [label('epic')], assignees: [] },
      ],
      '/git/matching-refs/heads/claude/issue-': [{ ref: 'refs/heads/claude/issue-63' }, { ref: 'refs/heads/claude/issue-63-run-1' }],
      '/issues/61/comments': comments,
    });

    const unjudged = fakeGitHub(routes([]));
    await handleEvent({ eventName: 'schedule', gh: unjudged.gh, owner, config });
    expect(unjudged.calls.filter((call) => call.method === 'POST' && call.path === '/issues')).toEqual([]);

    const judged = fakeGitHub(routes([skip]));
    await handleEvent({ eventName: 'schedule', gh: judged.gh, owner, config });
    expect(judged.calls.filter((call) => call.method === 'POST' && call.path === '/issues')).toHaveLength(1);
  });
});
