import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  BOT_LOGIN,
  QUEUE_ISSUE_TITLE,
  alreadyNotified,
  assessChecks,
  assessReadiness,
  claudeQueueState,
  createClient,
  handleEvent,
  hasChangesRequested,
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
  it('takes the newest structured report for the exact head only', () => {
    const comments = [
      { body: `<!-- evaluator-head: ${HEAD} -->\n## Evaluator verdict\n\n**FAIL — needs generator fix.** details`, html_url: 'u1' },
      { body: `<!-- evaluator-head: deadbeef -->\n## Evaluator verdict\n\nPASS — ready-for-human.`, html_url: 'u2' },
      { body: `<!-- evaluator-head: ${HEAD} -->\n## Evaluator verdict\n\nPASS — ready-for-human.`, html_url: 'u3' },
    ];

    expect(latestEvaluatorVerdict(comments, HEAD)).toEqual({ verdict: 'PASS', url: 'u3' });
  });

  it('ignores comments that only quote the marker or lack the verdict heading', () => {
    const comments = [
      { body: `Please review. <!-- evaluator-head: ${HEAD} -->\n## Evaluator verdict\n\nPASS` },
      { body: `<!-- evaluator-head: ${HEAD} -->\nPASS without heading` },
      { body: `<!-- evaluator-inconclusive: ${HEAD} -->\n## Evaluator verdict\n\nINCONCLUSIVE` },
    ];

    expect(latestEvaluatorVerdict(comments, HEAD)).toBeNull();
  });

  it('accepts the legacy local-evaluator marker', () => {
    const comments = [{ body: `<!-- local-evaluator sha=${HEAD} -->\n## Evaluator verdict\n\nBLOCKED — needs human decision` }];

    expect(latestEvaluatorVerdict(comments, HEAD)?.verdict).toBe('BLOCKED');
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
  });
});

describe('event handling against a fake GitHub API', () => {
  type Call = { method: string; path: string; body?: { body?: string; title?: string; state?: string } };

  function fakeGitHub(routes: Record<string, unknown>) {
    const calls: Call[] = [];
    const fetchImpl = async (url: string, init: { method: string; body?: string }) => {
      const path = url.replace('https://api.github.com/repos/o/r', '').replace(/[?&]per_page=100$/, '');
      calls.push({ method: init.method, path, body: init.body ? JSON.parse(init.body) : undefined });
      const data = init.method === 'GET' ? routes[path] : { number: 99 };
      if (data === undefined) return new Response('not found', { status: 404 });
      return new Response(JSON.stringify(data), { status: 200 });
    };
    return { gh: createClient({ repository: 'o/r', token: 't', fetchImpl }), calls };
  }

  const config = {
    protectedPaths: [{ group: 'factory', pattern: 'docs/agents/**' }],
    neverClaim: ['blocked', 'needs-triage'],
    mode: 'build',
  };
  const pr = { number: 658, ...openPr, labels: [label('agent:claude')], head: { sha: HEAD, ref: 'claude/issue-632' } };
  const passComment = {
    user: { login: 'caraseli02' },
    body: `<!-- evaluator-head: ${HEAD} -->\n## Evaluator verdict\n\nPASS — ready-for-human.`,
    html_url: 'pass',
  };
  const readyRoutes = (comments: unknown[]) => ({
    '/pulls/658': pr,
    '/issues/658/comments': comments,
    [`/commits/${HEAD}/check-runs`]: { check_runs: greenRuns },
    [`/commits/${HEAD}/status`]: { statuses: [] },
    '/pulls/658/reviews': [],
  });

  it('mentions the owner once when the evaluator PASS lands on a green, mergeable head', async () => {
    const { gh, calls } = fakeGitHub(readyRoutes([passComment]));
    await handleEvent({ eventName: 'issue_comment', event: { issue: { number: 658, pull_request: {} } }, gh, owner: 'caraseli02', config });

    const posts = calls.filter((call) => call.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0].path).toBe('/issues/658/comments');
    expect(posts[0].body?.body).toContain('@caraseli02');
    expect(posts[0].body?.body).toContain(marker(`ready:${HEAD}`));
  });

  it('does not post twice for the same head', async () => {
    const { gh, calls } = fakeGitHub(readyRoutes([passComment, { user: { login: BOT_LOGIN }, body: marker(`ready:${HEAD}`) }]));
    await handleEvent({ eventName: 'issue_comment', event: { issue: { number: 658, pull_request: {} } }, gh, owner: 'caraseli02', config });

    expect(calls.filter((call) => call.method === 'POST')).toEqual([]);
  });

  it('flags a Claude PR that touches protected paths without owner-approved-harness', async () => {
    const { gh, calls } = fakeGitHub({ ...readyRoutes([]), '/pulls/658/files': [{ filename: 'docs/agents/verification.md' }] });
    await handleEvent({ eventName: 'pull_request_target', event: { pull_request: { number: 658 } }, gh, owner: 'caraseli02', config });

    const posts = calls.filter((call) => call.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0].body?.body).toContain('owner-approved-harness');
    expect(posts[0].body?.body).toContain('docs/agents/verification.md');
  });

  it('points the owner at the blocker note when blocked is added', async () => {
    const { gh, calls } = fakeGitHub({
      '/issues/632/comments': [{ user: { login: 'caraseli02' }, body: '## Blocked\n\n- Issue: #632', html_url: 'blocker-url' }],
      '/issues?state=open': [],
    });
    await handleEvent({
      eventName: 'issues',
      event: { action: 'labeled', label: { name: 'blocked' }, issue: { number: 632 } },
      gh,
      owner: 'caraseli02',
      config,
    });

    const post = calls.find((call) => call.method === 'POST' && call.path === '/issues/632/comments');
    expect(post?.body?.body).toContain('blocker-url');
    expect(post?.body?.body).toContain('remove `blocked`');
  });

  it('opens one queue issue when Claude is idle and closes it when work appears', async () => {
    const idle = fakeGitHub({
      '/pulls?state=open': [],
      '/issues?state=open': [{ number: 2, title: 't', labels: [label('agent:claude'), label('needs-triage')], assignees: [] }],
    });
    await handleEvent({ eventName: 'schedule', event: {}, gh: idle.gh, owner: 'caraseli02', config: { ...config } });
    expect(idle.calls.find((call) => call.method === 'POST' && call.path === '/issues')?.body?.title).toBe(QUEUE_ISSUE_TITLE);

    const busy = fakeGitHub({
      '/pulls?state=open': [],
      '/issues?state=open': [
        { number: 3, title: 'next', labels: [label('agent:claude')], assignees: [] },
        { number: 50, title: QUEUE_ISSUE_TITLE, user: { login: BOT_LOGIN }, labels: [], assignees: [] },
      ],
    });
    await handleEvent({ eventName: 'schedule', event: {}, gh: busy.gh, owner: 'caraseli02', config });
    expect(busy.calls.find((call) => call.method === 'PATCH')).toMatchObject({ path: '/issues/50', body: { state: 'closed' } });
  });
});
