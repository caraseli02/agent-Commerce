#!/usr/bin/env node
// Notifies the repository owner when the autonomous workflow needs them.
//
// Every agent posts to GitHub through the owner's own account, and GitHub never
// notifies a user about their own activity. This script runs in GitHub Actions
// and posts as github-actions[bot], so its @mentions do reach the owner.
//
// Signals:
// - ready:   an open PR has a green CI, an exact-head evaluator PASS, no merge
//            conflict and no outstanding change request. Only the owner's merge is left.
// - blocked: an issue received the `blocked` label.
// - harness: a Claude-built PR touches protected paths without `owner-approved-harness`.
// - queue:   Claude has no live issue and nothing eligible to build.
//
// Each notice carries a hidden marker so a rerun never posts it twice.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

export const BOT_LOGIN = 'github-actions[bot]';
export const QUEUE_ISSUE_TITLE = "Owner attention: Claude's build queue is empty";
const log = (message) => process.stdout.write(`${message}\n`);
const OWN_CHECK_NAMES = new Set(['owner-attention']);
const REQUIRED_CHECK = 'verify';
const FAILED_CONCLUSIONS = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale']);

export function marker(key) {
  return `<!-- owner-attention: ${key} -->`;
}

export function alreadyNotified(comments, key) {
  const tag = marker(key);
  return (comments ?? []).some((comment) => comment?.user?.login === BOT_LOGIN && String(comment.body ?? '').includes(tag));
}

// Minimal reader for the parts of .factory/factory.yaml this script needs, so the
// workflow runs without installing dependencies.
export function parseFactoryConfig(yamlText) {
  const lines = String(yamlText ?? '').split(/\r?\n/);
  const protectedPaths = [];
  let inProtected = false;
  let group = null;
  let neverClaim = [];
  let mode = null;

  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, '');
    if (/^\S/.test(line)) {
      inProtected = /^protected_paths:\s*$/.test(line);
      group = null;
      continue;
    }
    if (inProtected) {
      const groupMatch = line.match(/^ {2}([\w-]+):\s*$/);
      if (groupMatch) {
        group = groupMatch[1];
        continue;
      }
      const itemMatch = line.match(/^\s+-\s+(\S+)\s*$/);
      if (itemMatch && group) protectedPaths.push({ group, pattern: itemMatch[1].replace(/^['"]|['"]$/g, '') });
      continue;
    }
    const neverClaimMatch = line.match(/^\s+never_claim:\s*\[(.*)\]\s*$/);
    if (neverClaimMatch) {
      neverClaim = neverClaimMatch[1]
        .split(',')
        .map((label) => label.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      continue;
    }
    const modeMatch = line.match(/^ {4}mode:\s*([\w-]+)/);
    if (modeMatch && mode === null) mode = modeMatch[1];
  }

  return { protectedPaths, neverClaim, mode };
}

export function globToRegExp(pattern) {
  let source = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '*' && pattern[index + 1] === '*') {
      source += '.*';
      index += 1;
    } else if (char === '*') {
      source += '[^/]*';
    } else {
      source += char.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`);
}

export function protectedFilesTouched(files, protectedPaths) {
  const matchers = protectedPaths.map(({ group, pattern }) => ({ group, regex: globToRegExp(pattern) }));
  const touched = [];
  for (const file of files ?? []) {
    const names = [file.filename, file.previous_filename].filter(Boolean);
    const hit = matchers.find(({ regex }) => names.some((name) => regex.test(name)));
    if (hit) touched.push({ file: file.filename, group: hit.group });
  }
  return touched;
}

export function isClaudeBuilt(pr) {
  const labels = (pr?.labels ?? []).map((label) => label?.name);
  return labels.includes('agent:claude') || String(pr?.head?.ref ?? '').startsWith('claude/');
}

// Newest structured evaluator report for the exact head, as autonomous-workflow.md defines it.
export function latestEvaluatorVerdict(comments, headSha) {
  const head = String(headSha ?? '').toLowerCase();
  if (!head) return null;
  const markers = [`<!-- evaluator-head: ${head} -->`, `<!-- local-evaluator sha=${head} -->`];
  let verdict = null;
  for (const comment of comments ?? []) {
    const body = String(comment?.body ?? '');
    const start = body.trimStart().toLowerCase();
    if (!markers.some((tag) => start.startsWith(tag)) || !body.includes('## Evaluator verdict')) continue;
    const after = body.slice(body.indexOf('## Evaluator verdict') + '## Evaluator verdict'.length);
    const firstLine = after.split(/\r?\n/).find((line) => line.trim()) ?? '';
    const match = firstLine.match(/^[\s*_>]*(PASS|FAIL|BLOCKED|INCONCLUSIVE)\b/i);
    if (match) verdict = { verdict: match[1].toUpperCase(), url: comment.html_url ?? null };
  }
  return verdict;
}

export function assessChecks(checkRuns, combinedStatus) {
  const failing = [];
  const pending = [];
  let requiredPassed = false;

  // A rerun (for example the PR template check after a label change) leaves the
  // superseded run behind as cancelled; only the newest run per name counts.
  const latest = new Map();
  for (const run of checkRuns ?? []) {
    const previous = latest.get(run.name);
    if (!previous || Number(run.id) > Number(previous.id)) latest.set(run.name, run);
  }

  for (const run of latest.values()) {
    if (OWN_CHECK_NAMES.has(run.name)) continue;
    if (run.status !== 'completed') pending.push(run.name);
    else if (FAILED_CONCLUSIONS.has(run.conclusion)) failing.push(run.name);
    else if (run.name === REQUIRED_CHECK && run.conclusion === 'success') requiredPassed = true;
  }
  for (const status of combinedStatus?.statuses ?? []) {
    if (status.state === 'pending') pending.push(status.context);
    else if (status.state === 'failure' || status.state === 'error') failing.push(status.context);
  }
  if (!requiredPassed && !failing.includes(REQUIRED_CHECK) && !pending.includes(REQUIRED_CHECK))
    pending.push(`${REQUIRED_CHECK} (not reported)`);

  const state = failing.length ? 'failure' : pending.length ? 'pending' : 'success';
  return { state, failing, pending };
}

// A reviewer's latest decisive review counts; a later approval or dismissal clears a change request.
export function hasChangesRequested(reviews) {
  const latest = new Map();
  for (const review of reviews ?? []) {
    if (!['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)) continue;
    latest.set(review.user?.login, review.state);
  }
  return [...latest.values()].includes('CHANGES_REQUESTED');
}

export function assessReadiness({ pr, checks, verdict, reviews }) {
  const reasons = [];
  if (pr.state !== 'open') reasons.push('PR is not open');
  if (pr.draft) reasons.push('PR is a draft');
  if (pr.mergeable === null || pr.mergeable === undefined) reasons.push('mergeability not computed yet');
  else if (pr.mergeable === false || pr.mergeable_state === 'dirty') reasons.push('merge conflict');
  if (checks.state !== 'success') reasons.push(`CI ${checks.state}: ${[...checks.failing, ...checks.pending].join(', ')}`);
  if (!verdict) reasons.push('no evaluator verdict for the current head');
  else if (verdict.verdict !== 'PASS') reasons.push(`evaluator verdict is ${verdict.verdict}`);
  if (hasChangesRequested(reviews)) reasons.push('changes requested by a reviewer');
  return { ready: reasons.length === 0, reasons };
}

export function parseDependencies(body) {
  const numbers = new Set();
  for (const line of String(body ?? '').split(/\r?\n/)) {
    const match = line.match(/^[\s>*-]*(?:\*\*)?(?:depends on|blocked by)(?:\*\*)?\s*:?\s*(.*)$/i);
    if (!match) continue;
    for (const ref of match[1].matchAll(/#(\d+)/g)) numbers.add(Number(ref[1]));
  }
  return [...numbers];
}

// Mirrors the build-eligibility rule in .factory/automations/claude-routine.md §4.1,
// without the checks that need git (remote branch) or a linked-PR lookup.
export function claudeQueueState(issues, { neverClaim, openIssueNumbers }) {
  const claude = (issues ?? []).filter(
    (issue) => !issue.pull_request && (issue.labels ?? []).some((label) => label.name === 'agent:claude'),
  );
  const labelsOf = (issue) => new Set((issue.labels ?? []).map((label) => label.name));
  const live = claude.filter((issue) => labelsOf(issue).has('in-progress') && !labelsOf(issue).has('blocked'));
  const eligible = claude.filter((issue) => {
    const labels = labelsOf(issue);
    if (labels.has('in-progress') || (issue.assignees ?? []).length) return false;
    if (neverClaim.some((label) => labels.has(label))) return false;
    if (/^(Payments|Checkout):/i.test(issue.title ?? '')) return false;
    return parseDependencies(issue.body).every((number) => !openIssueNumbers.has(number));
  });
  return { live, eligible, idle: live.length === 0 && eligible.length === 0 };
}

export function readyMessage({ owner, pr, verdict }) {
  return [
    marker(`ready:${pr.head.sha}`),
    `@${owner} ✅ **PR #${pr.number} is waiting only on your review and merge.**`,
    '',
    `- CI: green on \`${pr.head.sha.slice(0, 12)}\``,
    `- Evaluator: PASS on this exact head${verdict.url ? ` ([report](${verdict.url}))` : ''}`,
    `- Mergeable: yes (${pr.mergeable_state})`,
    '- No outstanding change requests',
  ].join('\n');
}

export function blockedMessage({ owner, issue, blockerUrl }) {
  return [
    marker(`blocked:${blockerUrl ?? issue.number}`),
    `@${owner} 🚧 **#${issue.number} is blocked and needs your decision.**`,
    '',
    blockerUrl ? `Blocker note: ${blockerUrl}` : 'See the latest comments for the blocker note.',
    '',
    'Make the decision the note asks for, then remove `blocked`. The next agent run resumes the same issue and branch.',
  ].join('\n');
}

export function harnessMessage({ owner, pr, touched }) {
  const payment = touched.filter((entry) => entry.group === 'payments');
  const factory = touched.filter((entry) => entry.group !== 'payments');
  const lines = [marker(`harness:${payment.length ? 'payments' : 'factory'}`)];
  if (factory.length) {
    lines.push(
      `@${owner} 🔐 **PR #${pr.number} changes protected harness paths and has no \`owner-approved-harness\` label.**`,
      '',
      ...factory.map((entry) => `- \`${entry.file}\``),
      '',
      'If you asked for this change, add `owner-approved-harness` now; only you can, and without it the evaluator must FAIL the PR. Otherwise ask for these files to be dropped.',
    );
  }
  if (payment.length) {
    lines.push(
      '',
      `@${owner} ⛔ **PR #${pr.number} is Claude-built and changes payment paths, which are never exempt.**`,
      '',
      ...payment.map((entry) => `- \`${entry.file}\``),
    );
  }
  return lines.join('\n').trim();
}

export function queueMessage({ owner, mode }) {
  return [
    marker('queue'),
    `@${owner} 💤 **Claude has nothing to build.**`,
    '',
    `The claude-routine (mode \`${mode}\`) has no live \`in-progress\` issue and no eligible \`agent:claude\` issue: every candidate is claimed, assigned, blocked, a payment item, waiting on an open \`Depends on #N\`, or carries a \`never_claim\` label (\`needs-triage\`, \`needs-info\`, \`epic\`, ...).`,
    '',
    'Label the next issue `agent:claude` (or clear its blocker) to give Claude work. This issue closes itself as soon as Claude has work again.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// GitHub plumbing

export function createClient({ repository, token, dryRun = false, fetchImpl = fetch }) {
  const base = `https://api.github.com/repos/${repository}`;
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' };

  async function request(method, path, body) {
    const url = path.startsWith('https://') ? path : `${base}${path}`;
    const response = await fetchImpl(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error(`${method} ${path} failed with HTTP ${response.status}: ${await response.text()}`);
    return { data: response.status === 204 ? null : await response.json(), link: response.headers.get('link') };
  }

  async function paginate(path, pick = (data) => data) {
    const items = [];
    let next = `${path}${path.includes('?') ? '&' : '?'}per_page=100`;
    while (next) {
      const { data, link } = await request('GET', next);
      items.push(...pick(data));
      next = link?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    }
    return items;
  }

  const write = (method) => (path, body) => {
    if (!dryRun) return request(method, path, body).then((result) => result.data);
    log(`[dry run] ${method} ${path}\n${body?.body ?? JSON.stringify(body)}\n`);
    return Promise.resolve({ number: 0 });
  };

  return {
    get: (path) => request('GET', path).then((result) => result.data),
    post: write('POST'),
    patch: write('PATCH'),
    paginate,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadPullRequest(gh, number) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const pr = await gh.get(`/pulls/${number}`);
    if (pr.mergeable !== null || pr.state !== 'open') return pr;
    await sleep(5000);
  }
  return gh.get(`/pulls/${number}`);
}

async function postOnce(gh, number, key, body) {
  const comments = await gh.paginate(`/issues/${number}/comments`);
  if (alreadyNotified(comments, key)) {
    log(`#${number}: ${key} already notified`);
    return false;
  }
  await gh.post(`/issues/${number}/comments`, { body });
  log(`#${number}: posted ${key}`);
  return true;
}

async function checkReady(gh, owner, number) {
  const pr = await loadPullRequest(gh, number);
  if (pr.state !== 'open' || pr.draft) return;
  const sha = pr.head.sha;
  const [comments, checkRuns, combinedStatus, reviews] = await Promise.all([
    gh.paginate(`/issues/${number}/comments`),
    gh.paginate(`/commits/${sha}/check-runs`, (data) => data.check_runs),
    gh.get(`/commits/${sha}/status`),
    gh.paginate(`/pulls/${number}/reviews`),
  ]);
  const verdict = latestEvaluatorVerdict(comments, sha);
  const checks = assessChecks(checkRuns, combinedStatus);
  const { ready, reasons } = assessReadiness({ pr, checks, verdict, reviews });
  if (!ready) {
    log(`PR #${number} not ready: ${reasons.join('; ')}`);
    return;
  }
  const key = `ready:${sha}`;
  if (alreadyNotified(comments, key)) {
    log(`PR #${number}: ${key} already notified`);
    return;
  }
  await gh.post(`/issues/${number}/comments`, { body: readyMessage({ owner, pr, verdict }) });
  log(`PR #${number}: posted ${key}`);
}

async function checkHarness(gh, owner, number, config) {
  const pr = await gh.get(`/pulls/${number}`);
  if (pr.state !== 'open' || !isClaudeBuilt(pr)) return;
  const labels = (pr.labels ?? []).map((label) => label.name);
  const files = await gh.paginate(`/pulls/${number}/files`);
  const touched = protectedFilesTouched(files, config.protectedPaths).filter(
    (entry) => entry.group === 'payments' || !labels.includes('owner-approved-harness'),
  );
  if (!touched.length) return;
  const key = `harness:${touched.some((entry) => entry.group === 'payments') ? 'payments' : 'factory'}`;
  await postOnce(gh, number, key, harnessMessage({ owner, pr, touched }));
}

async function checkBlocked(gh, owner, issue) {
  const comments = await gh.paginate(`/issues/${issue.number}/comments`);
  const human = comments.filter((comment) => comment.user?.login !== BOT_LOGIN);
  const blocker = [...human].reverse().find((comment) => /^\s*##\s*Blocked\b/m.test(comment.body ?? '')) ?? human.at(-1);
  const blockerUrl = blocker?.html_url ?? null;
  const key = `blocked:${blockerUrl ?? issue.number}`;
  if (alreadyNotified(comments, key)) return;
  await gh.post(`/issues/${issue.number}/comments`, { body: blockedMessage({ owner, issue, blockerUrl }) });
  log(`#${issue.number}: posted ${key}`);
}

async function checkQueue(gh, owner, config) {
  const openIssues = await gh.paginate('/issues?state=open');
  const tracking = openIssues.find((issue) => issue.title === QUEUE_ISSUE_TITLE && issue.user?.login === BOT_LOGIN);
  const openIssueNumbers = new Set(openIssues.map((issue) => issue.number));
  const state =
    config.mode === 'build' ? claudeQueueState(openIssues, { neverClaim: config.neverClaim, openIssueNumbers }) : { idle: false };

  if (state.idle && !tracking) {
    const created = await gh.post('/issues', { title: QUEUE_ISSUE_TITLE, body: queueMessage({ owner, mode: config.mode }) });
    log(`Opened #${created.number}: Claude queue is empty`);
  } else if (!state.idle && tracking) {
    await gh.post(`/issues/${tracking.number}/comments`, { body: 'Claude has work again; closing.' });
    await gh.patch(`/issues/${tracking.number}`, { state: 'closed', state_reason: 'completed' });
    log(`Closed #${tracking.number}: Claude has work again`);
  } else {
    log(
      `Claude queue: ${state.idle ? 'idle (already reported)' : `${state.live?.length ?? 0} live, ${state.eligible?.length ?? 0} eligible`}`,
    );
  }
}

async function sweepOpenPullRequests(gh, owner, config) {
  const prs = await gh.paginate('/pulls?state=open');
  for (const pr of prs) {
    if (pr.draft) continue;
    // One broken PR must not hide the others; the job still fails at the end.
    try {
      await checkHarness(gh, owner, pr.number, config);
      await checkReady(gh, owner, pr.number);
    } catch (error) {
      console.error(`PR #${pr.number}: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
}

export async function handleEvent({ eventName, event, gh, owner, config }) {
  switch (eventName) {
    case 'pull_request_target':
      await checkHarness(gh, owner, event.pull_request.number, config);
      await checkReady(gh, owner, event.pull_request.number);
      break;
    case 'issue_comment':
      if (event.issue?.pull_request) await checkReady(gh, owner, event.issue.number);
      break;
    case 'pull_request_review':
      await checkReady(gh, owner, event.pull_request.number);
      break;
    case 'workflow_run': {
      const numbers = (event.workflow_run?.pull_requests ?? []).map((pr) => pr.number);
      if (!numbers.length) {
        const sha = event.workflow_run?.head_sha;
        const open = await gh.paginate('/pulls?state=open');
        numbers.push(...open.filter((pr) => pr.head.sha === sha).map((pr) => pr.number));
      }
      for (const number of numbers) await checkReady(gh, owner, number);
      break;
    }
    case 'issues':
      if (event.label?.name === 'blocked') await checkBlocked(gh, owner, event.issue);
      if (['labeled', 'unlabeled', 'closed', 'reopened'].includes(event.action)) await checkQueue(gh, owner, config);
      break;
    case 'schedule':
    case 'workflow_dispatch':
      await sweepOpenPullRequests(gh, owner, config);
      await checkQueue(gh, owner, config);
      break;
    default:
      log(`Nothing to do for ${eventName}.`);
  }
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const eventName = process.env.GITHUB_EVENT_NAME;
  if (!repository || !token || !eventName) throw new Error('GITHUB_REPOSITORY, GITHUB_TOKEN and GITHUB_EVENT_NAME are required.');

  const owner = process.env.OWNER_LOGIN || process.env.GITHUB_REPOSITORY_OWNER;
  const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const config = parseFactoryConfig(await readFile('.factory/factory.yaml', 'utf8'));
  // With OWNER_ATTENTION_DRY_RUN set to 1 it reads live state and prints what it would post.
  const gh = createClient({ repository, token, dryRun: process.env.OWNER_ATTENTION_DRY_RUN === '1' });

  await handleEvent({ eventName, event, gh, owner, config });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
