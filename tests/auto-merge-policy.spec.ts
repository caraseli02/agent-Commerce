import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import {
  buildMergeCommit,
  classifyChangedFiles,
  classifyPath,
  decideMerge,
  parseAutoMergeCommit,
  planFromEvent,
} from '../scripts/auto-merge-policy.mjs';
import { evaluatePullRequest, pauseAfterFailedMain } from '../scripts/auto-merge.mjs';

const HEAD = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const EVALUATOR = 'ecas-evaluator';

type FileEntry = { filename: string; status?: string; previous_filename?: string };

function files(...paths: string[]): FileEntry[] {
  return paths.map((filename) => ({ filename, status: 'modified' }));
}

function pr(overrides: Record<string, unknown> = {}) {
  return {
    number: 42,
    title: 'docs: clarify setup',
    state: 'open',
    draft: false,
    mergeable: true,
    changed_files: 1,
    base: { ref: 'main' },
    head: { sha: HEAD, ref: 'docs/setup', label: 'caraseli02:docs/setup' },
    ...overrides,
  };
}

function ciRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    head_sha: HEAD,
    status: 'completed',
    conclusion: 'success',
    created_at: '2026-10-05T10:00:00Z',
    jobs: [{ name: 'verify', status: 'completed', conclusion: 'success' }],
    ...overrides,
  };
}

function evaluatorStatus(state: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    context: 'evaluator/verdict',
    state,
    created_at: '2026-10-05T11:00:00Z',
    updated_at: '2026-10-05T11:00:00Z',
    creator: { login: `${EVALUATOR}[bot]` },
    ...overrides,
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    enabled: 'true',
    eventSha: HEAD,
    pr: pr(),
    files: files('docs/setup.md'),
    ciRuns: [ciRun()],
    statuses: [evaluatorStatus('success')],
    checkRuns: [],
    evaluatorAppSlug: EVALUATOR,
    ...overrides,
  };
}

describe('auto-merge low-risk path classification', () => {
  it('allows docs-only changes', () => {
    expect(classifyChangedFiles(files('README.md', 'docs/adr/0001.md', 'docs/guide.md'))).toEqual({
      lowRisk: true,
      reasons: [],
    });
  });

  it('allows skills-only changes', () => {
    expect(classifyChangedFiles(files('.agents/skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md', 'skills-lock.json')).lowRisk).toBe(
      true,
    );
  });

  it('denies a mixed PR with any application file', () => {
    const result = classifyChangedFiles(files('docs/guide.md', 'components/ProductCard.vue'));

    expect(result.lowRisk).toBe(false);
    expect(result.reasons).toEqual(['components/ProductCard.vue is outside the low-risk allowlist']);
  });

  it('denies docs/agents/** even though it is under docs/', () => {
    expect(classifyPath('docs/agents/verification.md')).toMatch(/denylist/);
    expect(classifyPath('docs/Agents/verification.md')).toMatch(/denylist/);
    expect(classifyChangedFiles(files('docs/agents/auto-merge.md')).lowRisk).toBe(false);
  });

  it('denies .github/** and the other explicit denylist entries', () => {
    for (const path of [
      '.github/workflows/ci.yml',
      '.github/pull_request_template.md',
      '.husky/pre-push',
      'scripts/verify.mjs',
      'AGENTS.md',
      'CLAUDE.md',
      'DECISIONS.md',
      'package.json',
      'pnpm-lock.yaml',
    ]) {
      expect(classifyPath(path), path).toMatch(/denylist/);
    }
  });

  it('denies anything not on the allowlist, including tests and config', () => {
    for (const path of ['tests/cart.spec.ts', 'server/api/cart.ts', 'nuxt.config.ts', 'PROGRESS.md', 'skills/x.md']) {
      expect(classifyPath(path), path).toMatch(/outside the low-risk allowlist/);
    }
  });

  it('denies a rename out of a denied path', () => {
    const result = classifyChangedFiles([
      { filename: 'docs/old-workflow.md', previous_filename: '.github/workflows/ci.yml', status: 'renamed' },
    ]);

    expect(result.lowRisk).toBe(false);
    expect(result.reasons).toEqual(['.github/workflows/ci.yml is on the human-merge denylist']);
  });

  it('denies a rename into a denied path', () => {
    const result = classifyChangedFiles([{ filename: 'docs/agents/new.md', previous_filename: 'docs/new.md', status: 'renamed' }]);

    expect(result.lowRisk).toBe(false);
  });

  it('denies a deletion of a denied path', () => {
    expect(classifyChangedFiles([{ filename: 'scripts/verify.mjs', status: 'removed' }]).lowRisk).toBe(false);
  });

  it('denies an empty file list', () => {
    expect(classifyChangedFiles([])).toEqual({ lowRisk: false, reasons: ['changed-file list is empty'] });
  });

  it('denies a truncated file list', () => {
    expect(classifyChangedFiles(files('docs/a.md'), { expectedCount: 2 }).lowRisk).toBe(false);
  });
});

describe('auto-merge decision', () => {
  it('merges a low-risk PR with green CI and evaluator PASS on the head', () => {
    expect(decideMerge(input())).toEqual({ merge: true, sha: HEAD, reasons: [] });
  });

  function evaluatorCheck(id: number, status: string, conclusion: string | null, overrides: Record<string, unknown> = {}) {
    return {
      id,
      name: 'evaluator/verdict',
      head_sha: HEAD,
      status,
      conclusion,
      started_at: `2026-10-05T1${id % 10}:00:00Z`,
      completed_at: status === 'completed' ? `2026-10-05T1${id % 10}:30:00Z` : null,
      app: { slug: EVALUATOR },
      ...overrides,
    };
  }

  it('does not accept a check run alone as the evaluator PASS (status is the contract)', () => {
    const checkRuns = [evaluatorCheck(3, 'completed', 'success')];

    expect(decideMerge(input({ statuses: [], checkRuns })).reasons).toContain(
      `no evaluator/verdict commit status from ${EVALUATOR}[bot] on head ${HEAD}`,
    );
  });

  it('merges when the trusted check run, if any, also succeeded on its newest attempt', () => {
    const checkRuns = [evaluatorCheck(3, 'completed', 'failure'), evaluatorCheck(4, 'completed', 'success')];

    expect(decideMerge(input({ checkRuns })).merge).toBe(true);
  });

  it.each([
    ['queued', evaluatorCheck(4, 'queued', null)],
    ['in progress', evaluatorCheck(4, 'in_progress', null)],
  ])('denies when a newer evaluator check is %s after an older PASS', (_label, newer) => {
    // The older PASS completed later than the newer attempt started: completion order must not win.
    const older = evaluatorCheck(3, 'completed', 'success', { completed_at: '2026-10-05T23:00:00Z' });
    const decision = decideMerge(input({ checkRuns: [older, newer] }));

    expect(decision.merge).toBe(false);
    expect(decision.reasons.join('\n')).toMatch(/evaluator\/verdict check run is (queued|in_progress)\/none/);
  });

  it('denies when a newer evaluator status is pending after an older PASS, regardless of timestamps', () => {
    const statuses = [
      evaluatorStatus('success', { id: 10, created_at: '2026-10-05T12:00:00Z', updated_at: '2026-10-05T12:00:00Z' }),
      evaluatorStatus('pending', { id: 11, created_at: '2026-10-05T11:59:59Z', updated_at: '2026-10-05T11:59:59Z' }),
    ];

    expect(decideMerge(input({ statuses })).merge).toBe(false);
  });

  it.each([
    ['missing', []],
    ['failure', [evaluatorStatus('failure')]],
    ['pending', [evaluatorStatus('pending')]],
    ['error ("did not run")', [evaluatorStatus('error')]],
  ])('denies when the evaluator verdict is %s', (_label, statuses) => {
    const decision = decideMerge(input({ statuses }));

    expect(decision.merge).toBe(false);
    expect(decision.reasons.join('\n')).toMatch(/evaluator\/verdict/);
  });

  it('denies an evaluator check run that did not run (neutral/skipped)', () => {
    for (const conclusion of ['neutral', 'skipped', 'cancelled', 'action_required']) {
      const checkRuns = [evaluatorCheck(3, 'completed', conclusion)];

      expect(decideMerge(input({ checkRuns })).merge, conclusion).toBe(false);
    }
  });

  it('denies when the newest evaluator status supersedes an earlier PASS', () => {
    const statuses = [
      evaluatorStatus('success', { id: 10, updated_at: '2026-10-05T11:00:00Z' }),
      evaluatorStatus('failure', { id: 11, updated_at: '2026-10-05T12:00:00Z' }),
    ];

    expect(decideMerge(input({ statuses })).merge).toBe(false);
  });

  it('ignores evaluator/verdict from any source other than the Evaluator App', () => {
    const statuses = [evaluatorStatus('success', { creator: { login: 'github-actions[bot]' } })];

    expect(decideMerge(input({ statuses })).reasons).toContain(`no evaluator/verdict commit status from ${EVALUATOR}[bot] on head ${HEAD}`);
  });

  it('denies when the Evaluator App slug is not configured', () => {
    expect(decideMerge(input({ evaluatorAppSlug: undefined })).merge).toBe(false);
    expect(decideMerge(input({ evaluatorAppSlug: '' })).merge).toBe(false);
  });

  it.each([
    ['missing', []],
    ['failed', [ciRun({ conclusion: 'failure' })]],
    ['in progress', [ciRun({ status: 'in_progress', conclusion: null })]],
    ['for another SHA', [ciRun({ head_sha: OTHER })]],
    ['without a verify job', [ciRun({ jobs: [] })]],
    ['with a failed verify job', [ciRun({ jobs: [{ name: 'verify', status: 'completed', conclusion: 'failure' }] })]],
  ])('denies when CI is %s', (_label, ciRuns) => {
    expect(decideMerge(input({ ciRuns })).merge).toBe(false);
  });

  it('uses the newest CI run when an older one succeeded', () => {
    const ciRuns = [
      ciRun({ id: 1, created_at: '2026-10-05T09:00:00Z' }),
      ciRun({ id: 2, created_at: '2026-10-05T10:00:00Z', conclusion: 'failure' }),
    ];

    expect(decideMerge(input({ ciRuns })).merge).toBe(false);
  });

  it('denies when the event head SHA no longer matches the PR head', () => {
    const decision = decideMerge(input({ eventSha: OTHER }));

    expect(decision.merge).toBe(false);
    expect(decision.reasons).toContain(`event SHA ${OTHER} does not match current head ${HEAD}`);
  });

  it.each([[undefined], ['false'], ['TRUE'], [' true'], ['1']])('denies when AUTO_MERGE_ENABLED is %j', (enabled) => {
    expect(decideMerge(input({ enabled })).merge).toBe(false);
  });

  it.each([
    ['closed', { state: 'closed' }],
    ['a draft', { draft: true }],
    ['not targeting main', { base: { ref: 'release' } }],
    ['conflicting', { mergeable: false }],
    ['still computing mergeability', { mergeable: null }],
  ])('denies a PR that is %s', (_label, overrides) => {
    expect(decideMerge(input({ pr: pr(overrides) })).merge).toBe(false);
  });

  it('denies an application PR even with green CI and evaluator PASS', () => {
    const decision = decideMerge(input({ pr: pr({ changed_files: 2 }), files: files('docs/a.md', 'pages/cart.vue') }));

    expect(decision).toEqual({
      merge: false,
      sha: HEAD,
      reasons: ['pages/cart.vue is outside the low-risk allowlist'],
    });
  });
});

describe('auto-merge event routing', () => {
  it('evaluates PRs after a successful pull_request CI run', () => {
    expect(
      planFromEvent('workflow_run', {
        workflow_run: {
          path: '.github/workflows/ci.yml',
          event: 'pull_request',
          conclusion: 'success',
          head_sha: HEAD,
          pull_requests: [{ number: 7 }],
        },
      }),
    ).toEqual({ kind: 'evaluate', prNumbers: [7], sha: HEAD });
  });

  it('checks for an auto-pause after a failed CI push run on main', () => {
    expect(
      planFromEvent('workflow_run', {
        workflow_run: {
          path: '.github/workflows/ci.yml',
          event: 'push',
          head_branch: 'main',
          conclusion: 'failure',
          head_sha: HEAD,
          html_url: 'https://github.com/run/1',
        },
      }),
    ).toEqual({ kind: 'pause-check', sha: HEAD, runUrl: 'https://github.com/run/1', conclusion: 'failure' });
  });

  it('only lets a successful evaluator/verdict status start an evaluation', () => {
    expect(planFromEvent('status', { context: 'evaluator/verdict', state: 'success', sha: HEAD })).toEqual({
      kind: 'evaluate',
      prNumbers: [],
      sha: HEAD,
    });
    expect(planFromEvent('status', { context: 'evaluator/verdict', state: 'error', sha: HEAD }).kind).toBe('skip');
    expect(planFromEvent('status', { context: 'vercel', state: 'success', sha: HEAD }).kind).toBe('skip');
  });

  it('requires a PR number for manual re-evaluation', () => {
    expect(planFromEvent('workflow_dispatch', {}, { prNumber: '12' })).toEqual({
      kind: 'evaluate',
      prNumbers: [12],
      sha: null,
    });
    expect(planFromEvent('workflow_dispatch', {}, { prNumber: '' }).kind).toBe('skip');
  });

  it('skips unrelated events', () => {
    expect(planFromEvent('pull_request_target', {}).kind).toBe('skip');
    expect(planFromEvent('check_run', { check_run: { name: 'evaluator/verdict', conclusion: 'success', head_sha: HEAD } }).kind).toBe(
      'skip',
    );
  });
});

describe('auto-merge commit trailer', () => {
  it('round-trips the PR number through the merge commit message', () => {
    const commit = buildMergeCommit(pr());

    expect(commit.commit_title).toBe('Merge pull request #42 from caraseli02/docs/setup');
    expect(parseAutoMergeCommit(`${commit.commit_title}\n\n${commit.commit_message}`)).toEqual({ prNumber: 42 });
  });

  it('does not treat a normal merge commit as an auto-merge', () => {
    expect(parseAutoMergeCommit('Merge pull request #590 from caraseli02/codex/583\n\nfix(checkout)')).toBeNull();
  });
});

function fakeGitHub(routes: Record<string, unknown>) {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];

  async function request(method: string, path: string, body?: unknown) {
    calls.push({ method, path, body });
    const key = `${method} ${path.split('?')[0]}`;

    if (key in routes) {
      const value = routes[key] as { failWith?: number } | null;

      if (value && typeof value === 'object' && 'failWith' in value) {
        return { ok: false, status: value.failWith as number, data: { message: 'Resource not accessible by integration' } };
      }

      return { ok: true, status: 200, data: value };
    }

    return { ok: false, status: 404, data: { message: 'Not Found' } };
  }

  return {
    calls,
    request,
    async get(path: string) {
      const response = await request('GET', path);

      if (!response.ok) throw new Error(`unexpected GET ${path}`);
      return response.data;
    },
    async paginate(path: string, pick = (data: unknown) => data) {
      const response = await request('GET', path);

      return response.ok ? (pick(response.data) ?? []) : [];
    },
  };
}

describe('auto-merge runner', () => {
  const quiet = () => {};

  function mergeableRoutes(overrides: Record<string, unknown> = {}) {
    return {
      'GET /pulls/42': pr(),
      'GET /pulls/42/files': files('docs/setup.md'),
      'GET /actions/workflows/ci.yml/runs': { workflow_runs: [ciRun()] },
      'GET /actions/runs/1/jobs': { jobs: ciRun().jobs },
      [`GET /commits/${HEAD}/statuses`]: [evaluatorStatus('success')],
      [`GET /commits/${HEAD}/check-runs`]: { check_runs: [] },
      'GET /actions/variables/AUTO_MERGE_ENABLED': { name: 'AUTO_MERGE_ENABLED', value: 'true' },
      'PUT /pulls/42/merge': { sha: 'c'.repeat(40), merged: true },
      ...overrides,
    };
  }

  it('merges with the evaluated head SHA pinned as a merge commit', async () => {
    const github = fakeGitHub(mergeableRoutes());
    const result = await evaluatePullRequest(github, {
      prNumber: 42,
      eventSha: HEAD,
      evaluatorAppSlug: EVALUATOR,
      log: quiet,
    });

    expect(result.merged).toBe(true);
    expect(github.calls.find((call) => call.method === 'PUT')?.body).toMatchObject({
      sha: HEAD,
      merge_method: 'merge',
      commit_title: 'Merge pull request #42 from caraseli02/docs/setup',
    });
  });

  it('does not call the merge API when the variable is missing', async () => {
    const routes = mergeableRoutes();

    delete (routes as Record<string, unknown>)['GET /actions/variables/AUTO_MERGE_ENABLED'];
    const github = fakeGitHub(routes);
    const result = await evaluatePullRequest(github, {
      prNumber: 42,
      eventSha: HEAD,
      evaluatorAppSlug: EVALUATOR,
      log: quiet,
    });

    expect(result.merged).toBe(false);
    expect(github.calls.some((call) => call.method === 'PUT')).toBe(false);
  });

  it('reads every evaluator check-run attempt, not only the latest completed one', async () => {
    const github = fakeGitHub(
      mergeableRoutes({
        [`GET /commits/${HEAD}/check-runs`]: {
          check_runs: [
            { id: 3, name: 'evaluator/verdict', head_sha: HEAD, status: 'completed', conclusion: 'success', app: { slug: EVALUATOR } },
            { id: 4, name: 'evaluator/verdict', head_sha: HEAD, status: 'in_progress', conclusion: null, app: { slug: EVALUATOR } },
          ],
        },
      }),
    );
    const result = await evaluatePullRequest(github, { prNumber: 42, eventSha: HEAD, evaluatorAppSlug: EVALUATOR, log: quiet });

    expect(result.merged).toBe(false);
    expect(github.calls.find((call) => call.path.includes('/check-runs'))?.path).toContain('filter=all');
  });

  it('pauses auto-merge and opens an issue when CI fails on an auto-merged main commit', async () => {
    const { commit_title, commit_message } = buildMergeCommit(pr());
    const github = fakeGitHub({
      [`GET /commits/${HEAD}`]: { commit: { message: `${commit_title}\n\n${commit_message}` } },
      'PATCH /actions/variables/AUTO_MERGE_ENABLED': null,
      'GET /issues': [],
      'POST /issues': { number: 99 },
    });
    const result = await pauseAfterFailedMain(github, {
      sha: HEAD,
      runUrl: 'https://github.com/caraseli02/agent-Commerce/actions/runs/5',
      conclusion: 'failure',
      serverUrl: 'https://github.com',
      repository: 'caraseli02/agent-Commerce',
      log: quiet,
    });

    expect(result).toEqual({ paused: true, prNumber: 42 });
    expect(github.calls.find((call) => call.method === 'PATCH')?.body).toEqual({
      name: 'AUTO_MERGE_ENABLED',
      value: 'false',
    });

    const issue = github.calls.find((call) => call.method === 'POST' && call.path === '/issues')?.body as {
      body: string;
    };

    expect(issue.body).toContain(`/commit/${HEAD}`);
    expect(issue.body).toContain('#42');
    expect(issue.body).toContain('/actions/runs/5');
  });

  function autoMergedCommitRoutes(overrides: Record<string, unknown> = {}) {
    const { commit_title, commit_message } = buildMergeCommit(pr());

    return {
      [`GET /commits/${HEAD}`]: { commit: { message: `${commit_title}\n\n${commit_message}` } },
      'PATCH /actions/variables/AUTO_MERGE_ENABLED': null,
      'GET /issues': [],
      'POST /issues': { number: 99 },
      ...overrides,
    };
  }

  const pauseInput = {
    sha: HEAD,
    runUrl: 'https://github.com/caraseli02/agent-Commerce/actions/runs/5',
    conclusion: 'failure',
    serverUrl: 'https://github.com',
    repository: 'caraseli02/agent-Commerce',
    log: () => {},
  };

  it('fails visibly when the incident issue cannot be opened', async () => {
    const github = fakeGitHub(autoMergedCommitRoutes({ 'POST /issues': { failWith: 403 } }));

    await expect(pauseAfterFailedMain(github, pauseInput)).rejects.toThrow(/opening the incident issue .* failed \(403\).*Issues: write/);
  });

  it('fails visibly when AUTO_MERGE_ENABLED cannot be set to false', async () => {
    const github = fakeGitHub(autoMergedCommitRoutes({ 'PATCH /actions/variables/AUTO_MERGE_ENABLED': { failWith: 403 } }));

    await expect(pauseAfterFailedMain(github, pauseInput)).rejects.toThrow(/Auto-merge is NOT paused/);
    expect(github.calls.some((call) => call.path === '/issues')).toBe(false);
  });

  it('creates AUTO_MERGE_ENABLED=false when the variable does not exist yet', async () => {
    const routes: Record<string, unknown> = autoMergedCommitRoutes({ 'POST /actions/variables': null });

    delete routes['PATCH /actions/variables/AUTO_MERGE_ENABLED'];
    const github = fakeGitHub(routes);

    expect((await pauseAfterFailedMain(github, pauseInput)).paused).toBe(true);
    expect(github.calls.find((call) => call.path === '/actions/variables')?.body).toEqual({
      name: 'AUTO_MERGE_ENABLED',
      value: 'false',
    });
  });

  it('leaves auto-merge enabled when the failing main commit was a human merge', async () => {
    const github = fakeGitHub({
      [`GET /commits/${HEAD}`]: { commit: { message: 'Merge pull request #590 from caraseli02/codex/583' } },
    });
    const result = await pauseAfterFailedMain(github, {
      sha: HEAD,
      runUrl: 'https://github.com/run/5',
      conclusion: 'failure',
      serverUrl: 'https://github.com',
      repository: 'caraseli02/agent-Commerce',
      log: quiet,
    });

    expect(result.paused).toBe(false);
    expect(github.calls.some((call) => call.method !== 'GET')).toBe(false);
  });
});

describe('auto-merge workflow boundary', () => {
  it('runs trusted main code only, through the Merger App environment', async () => {
    const workflow = await readFile('.github/workflows/auto-merge.yml', 'utf8');

    expect(workflow).not.toContain('pull_request_target:');
    expect(workflow).not.toMatch(/github\.event\.pull_request\.head|workflow_run\.head_sha\s*}}|head_branch\s*}}/);
    expect(workflow).toContain('environment: auto-merge');
    expect(workflow).toContain('actions/create-github-app-token@v2');
    expect(workflow).toContain('ref: ${{ github.event.repository.default_branch }}');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toMatch(/permissions:\n {2}contents: read\n/);
    // check_run events are suppressed for SHAs with Actions check suites, so they can't be a wakeup.
    expect(workflow).not.toMatch(/^\s*check_run:/m);
  });
});
