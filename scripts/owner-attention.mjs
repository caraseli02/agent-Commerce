#!/usr/bin/env node
// Shared autonomous-workflow policy and read-only local readiness CLI.
// The Actions notifier is retired. Existing agent chats surface owner attention;
// no bot delivery is implied by a self-mention.
//
// Signals:
// - ready:   an open PR has local verification, an exact-head evaluator PASS, no merge
//            conflict and no outstanding change request. Only the owner's merge is left.
// - blocked: an open issue currently carries the `blocked` label.
// - harness: a Claude-built PR touches protected paths without `owner-approved-harness`.
// - queue:   Claude has no live issue and nothing eligible to build (a PASSed claim
//            waiting for merge is queued, not live).
//
// Each notice carries a hidden marker so a rerun never posts it twice.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { assessPrTemplate } from './check-pr-template.mjs';

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

// Provenance signals that need no extra API call (claude-routine.md §3 lists all of them).
export function isClaudeBuilt(pr) {
  const labels = (pr?.labels ?? []).map((label) => label?.name);
  return (
    labels.includes('agent:claude') ||
    String(pr?.head?.ref ?? '').startsWith('claude/') ||
    String(pr?.body ?? '').includes('Generated with [Claude Code]')
  );
}

// Issues a PR body closes with a GitHub closing keyword.
export function closingIssueNumbers(body) {
  const numbers = new Set();
  for (const match of String(body ?? '').matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+#(\d+)/gi))
    numbers.add(Number(match[1]));
  return [...numbers];
}

export function hasClaudeCoauthor(commits) {
  return (commits ?? []).some((commit) => /^Co-Authored-By: Claude\b/im.test(commit?.commit?.message ?? ''));
}

// Every provenance signal the routine uses: label, branch, body signature, a linked
// `agent:claude` issue, or a `Co-Authored-By: Claude` commit trailer.
export async function isClaudeBuiltPr(gh, pr) {
  if (isClaudeBuilt(pr)) return true;
  for (const number of closingIssueNumbers(pr.body)) {
    const issue = await gh.get(`/issues/${number}`);
    if ((issue?.labels ?? []).some((label) => label.name === 'agent:claude')) return true;
  }
  return hasClaudeCoauthor(await gh.paginate(`/pulls/${pr.number}/commits`));
}

const VERDICT_HEADING = '## Evaluator verdict';
// `Independent evaluator:` at line start (optionally bold) followed by a non-empty attribution.
const ATTRIBUTION_LINE = /^[ \t>]*(?:[*_]{1,2})?Independent evaluator(?:[*_]{1,2})?[ \t]*:(?:[*_]{1,2})?[ \t]*[^\s*_]/im;

// Structured evaluator verdict for the exact head, as autonomous-workflow.md defines it:
// it must come from an account the evaluators post through and carry explicit
// independent-evaluator attribution, so an outsider's look-alike comment never counts.
// Contradictory reports for the same head need clarification, so they resolve to
// CONFLICTING rather than letting the newest one win.
export function latestEvaluatorVerdict(comments, headSha, { trustedLogins }) {
  const head = String(headSha ?? '').toLowerCase();
  if (!head) return null;
  const trusted = new Set((trustedLogins ?? []).map((login) => String(login).toLowerCase()));
  trusted.delete(BOT_LOGIN);
  const markers = [`<!-- evaluator-head: ${head} -->`, `<!-- local-evaluator sha=${head} -->`];
  const reports = [];
  for (const comment of comments ?? []) {
    const body = String(comment?.body ?? '');
    const start = body.trimStart().toLowerCase();
    if (!trusted.has(String(comment?.user?.login ?? '').toLowerCase())) continue;
    if (!markers.some((tag) => start.startsWith(tag)) || !body.includes(VERDICT_HEADING)) continue;
    if (!ATTRIBUTION_LINE.test(body)) continue;
    const after = body.slice(body.indexOf(VERDICT_HEADING) + VERDICT_HEADING.length);
    const firstLine = after.split(/\r?\n/).find((line) => line.trim()) ?? '';
    const match = firstLine.match(/^[\s*_>]*(PASS|FAIL|BLOCKED|INCONCLUSIVE)\b/i);
    if (match) reports.push({ verdict: match[1].toUpperCase(), url: comment.html_url ?? null });
  }
  if (!reports.length) return null;
  const latest = reports.at(-1);
  const verdicts = [...new Set(reports.map((report) => report.verdict))];
  return verdicts.length > 1 ? { verdict: 'CONFLICTING', url: latest.url, verdicts } : latest;
}

// An independent review attests local execution; this is not a separate CI receipt.
// Include live metadata so a changed description or authorization needs revalidation.
export function localVerificationMarker(pr) {
  const labels = (pr.labels ?? []).map((label) => (typeof label === 'string' ? label : label.name)).sort();
  const metadata = createHash('sha256')
    .update(JSON.stringify([pr.body ?? '', labels, pr.base.ref]))
    .digest('hex');
  return `<!-- local-verification: head=${pr.head.sha} base=${pr.base.sha} metadata=${metadata} -->`;
}

export function assessLocalChecks(pr, comments, { trustedLogins, expectedEvaluator }) {
  const pending = [];
  const failing = [];
  const template = assessPrTemplate({ body: pr.body, labels: (pr.labels ?? []).map((label) => label.name ?? label) });
  if (template.status === 'failed') failing.push(...template.violations);
  const marker = localVerificationMarker(pr);
  const verified = comments.some((comment) => {
    const verdict = latestEvaluatorVerdict([comment], pr.head.sha, { trustedLogins });
    const attribution = String(comment.body ?? '').match(
      /^[ \t]*(?:\*{1,2})?Independent evaluator(?:\*{1,2})?\s*:(?:\*{1,2})?[^\S\n]*([^\n]+)/im,
    );
    return (
      verdict?.verdict === 'PASS' &&
      new RegExp(`\\b${expectedEvaluator}\\b`, 'i').test(attribution?.[1] ?? '') &&
      String(comment.body).split(/\r?\n/).includes(marker)
    );
  });
  if (!verified) pending.push('independent local verification for current head/base/metadata');
  return { state: failing.length ? 'failure' : pending.length ? 'pending' : 'success', failing, pending };
}

// Read-only GitHub client using the existing gh login. No token is extracted.
export function createGhClient(repository) {
  const api = (path, pages = false) => {
    const args = ['api', `repos/${repository}${path}`];
    if (pages) args.push('--paginate', '--slurp');
    const value = JSON.parse(execFileSync('gh', args, { encoding: 'utf8', timeout: 30_000 }));
    return pages ? value.flat() : value;
  };
  return { get: (path) => api(path), paginate: (path) => api(`${path}${path.includes('?') ? '&' : '?'}per_page=100`, true) };
}

export async function readLocalEvidence(number, { gh, owner, config, trustedLogins = [owner] }) {
  const pr = await gh.get(`/pulls/${number}`);
  const ref = `/git/ref/heads/${encodeURIComponent(pr.base.ref)}`;
  pr.base.sha = (await gh.get(ref)).object.sha;
  const comments = await gh.paginate(`/issues/${number}/comments`);
  const reviews = await gh.paginate(`/pulls/${number}/reviews`);
  const claude = await isClaudeBuiltPr(gh, pr);
  const checks = assessLocalChecks(pr, comments, { trustedLogins, expectedEvaluator: claude ? 'Codex' : 'Claude' });
  const verdict = latestEvaluatorVerdict(comments, pr.head.sha, { trustedLogins });
  const readiness = assessReadiness({ pr, checks, verdict, reviews });
  if (claude) {
    const files = await gh.paginate(`/pulls/${number}/files`);
    const touched = protectedFilesTouched(files, config.protectedPaths);
    if (
      touched.some((entry) => entry.group === 'payments' || !(pr.labels ?? []).some((label) => label.name === 'owner-approved-harness'))
    ) {
      readiness.ready = false;
      readiness.reasons.push('Claude protected-path authorization missing or payment path changed');
    }
  }
  // A changing context during the read is pending, never an old green result.
  const current = await gh.get(`/pulls/${number}`);
  const base = (await gh.get(ref)).object.sha;
  if (
    current.state !== 'open' ||
    current.draft ||
    current.mergeable !== true ||
    current.base.ref !== pr.base.ref ||
    current.head.sha !== pr.head.sha ||
    base !== pr.base.sha ||
    localVerificationMarker({ ...current, base: { ...current.base, sha: base } }) !== localVerificationMarker(pr)
  ) {
    readiness.ready = false;
    readiness.reasons.push('PR context changed during readiness read');
  }
  return { head: pr.head.sha, base: pr.base.sha, marker: localVerificationMarker(pr), checks, readiness };
}

// Head SHAs that carry an evaluator PASS: the review history shows the PR passed once,
// so only the owner's merge is left (or a repair of a later change). Heads come from
// comments that start with an evaluator marker; each head is then resolved by
// latestEvaluatorVerdict, so trust, attribution and contradiction rules match.
const EVALUATOR_HEAD_MARKER = /^<!--\s*(?:evaluator-head:\s*|local-evaluator\s+sha=)([0-9a-f]+)\s*-->/i;
export function passingEvaluatorHeads(comments, { trustedLogins }) {
  const heads = new Set();
  for (const comment of comments ?? []) {
    const match = String(comment?.body ?? '')
      .trimStart()
      .match(EVALUATOR_HEAD_MARKER);
    if (match) heads.add(match[1].toLowerCase());
  }
  return [...heads].filter((head) => {
    const result = latestEvaluatorVerdict(comments, head, { trustedLogins });
    return result?.verdict === 'PASS' || (result?.verdict === 'CONFLICTING' && result.verdicts.includes('PASS'));
  });
}

export function hasEvaluatorPassOnAnyHead(comments, { trustedLogins }) {
  return passingEvaluatorHeads(comments, { trustedLogins }).length > 0;
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
  else if (verdict.verdict === 'CONFLICTING')
    reasons.push(`contradictory evaluator reports for the current head (${verdict.verdicts.join(', ')}) need clarification`);
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

const SKIP_RECORD = /^<!-- claude-skip v=([0-9a-f]{16}) -->/;
// Notes the night lane posts on candidate issues; they say nothing about whether the skip
// reason still holds, so a trusted one never counts as the "newest comment".
const NIGHT_LANE_NOTE = /^<!-- claude-(?:plan |spike |diagnosis)/;

// Fingerprint of the parts of an issue a skip decision depends on: title, body and
// labels. The routine writes it into the skip comment (`skip-fingerprint` command
// below), so any later edit or label change is detected exactly, with no time window.
export function issueFingerprint(issue) {
  const normalize = (text) =>
    String(text ?? '')
      .replace(/\r\n/g, '\n')
      .trim();
  const labels = (issue?.labels ?? [])
    .map((label) => (typeof label === 'string' ? label : label?.name))
    .filter(Boolean)
    .sort();
  const snapshot = JSON.stringify({ title: normalize(issue?.title), body: normalize(issue?.body), labels });
  return createHash('sha256').update(snapshot).digest('hex').slice(0, 16);
}

// The routine records each label-eligible issue it skips (protected scope, a prose or
// native dependency, a linked PR or branch) with a `<!-- claude-skip v=<fingerprint> -->`
// comment. The record holds only while it is the issue's newest comment and the issue's
// title, body and labels still match the fingerprint; any later comment or change lapses
// it, and the routine then re-evaluates the issue. The one exception is a trusted
// night-lane note (first line `<!-- claude-plan `, `<!-- claude-spike ` or
// `<!-- claude-diagnosis`), which is ignored when finding the newest comment.
export function hasCurrentSkipRecord(issue, comments, { trustedLogins }) {
  const trusted = new Set((trustedLogins ?? []).map((login) => String(login).toLowerCase()));
  trusted.delete(BOT_LOGIN);
  const isTrusted = (comment) => trusted.has(String(comment?.user?.login ?? '').toLowerCase());
  const latestComment = [...(comments ?? [])]
    .filter((comment) => !(isTrusted(comment) && NIGHT_LANE_NOTE.test(String(comment?.body ?? '').trimStart())))
    .sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0))
    .at(-1);
  if (!latestComment || !isTrusted(latestComment)) return false;
  const record = String(latestComment.body ?? '')
    .trimStart()
    .match(SKIP_RECORD);
  return Boolean(record) && record[1] === issueFingerprint(issue);
}

// Mirrors the build-eligibility rule in .factory/automations/claude-routine.md §4.1.
// Claims split three ways: parked (`blocked`), queued and live. A queued claim is
// `in-progress`, not `blocked`, and its open `claude/issue-<n>` PR has an evaluator PASS on
// some head (`queuedNumbers`; the `ready-for-human` label does not decide it, because a
// repair removes it while the claim stays queued). A claim with no open PR, such as one
// whose PR was closed unmerged, is live. Only live claims and eligible issues keep the
// queue busy.
// `claimedNumbers` are issues an open PR already closes or that have a claude/issue-<n>
// branch; `skippedNumbers` carry a current skip record for checks that need judgment.
export function claudeQueueState(
  issues,
  { neverClaim, openIssueNumbers, claimedNumbers = new Set(), skippedNumbers = new Set(), queuedNumbers = new Set() },
) {
  const claude = (issues ?? []).filter(
    (issue) => !issue.pull_request && (issue.labels ?? []).some((label) => label.name === 'agent:claude'),
  );
  const labelsOf = (issue) => new Set((issue.labels ?? []).map((label) => label.name));
  const claimed = claude.filter((issue) => labelsOf(issue).has('in-progress') && !labelsOf(issue).has('blocked'));
  const queued = claimed.filter((issue) => queuedNumbers.has(issue.number));
  const live = claimed.filter((issue) => !queuedNumbers.has(issue.number));
  const eligible = claude.filter((issue) => {
    const labels = labelsOf(issue);
    if (labels.has('in-progress') || (issue.assignees ?? []).length) return false;
    if (neverClaim.some((label) => labels.has(label))) return false;
    if (/^(Payments|Checkout):/i.test(issue.title ?? '')) return false;
    if ((issue.issue_dependencies_summary?.blocked_by ?? 0) > 0) return false;
    if (claimedNumbers.has(issue.number) || skippedNumbers.has(issue.number)) return false;
    return parseDependencies(issue.body).every((number) => !openIssueNumbers.has(number));
  });
  return { live, queued, eligible, idle: live.length === 0 && eligible.length === 0 };
}

export function readyMessage({ owner, pr, verdict, key = `ready:${pr.head.sha}` }) {
  return [
    marker(key),
    `@${owner} ✅ **PR #${pr.number} is waiting only on your review and merge.**`,
    '',
    `- Local verification: passed on \`${pr.head.sha.slice(0, 12)}\``,
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
    `The claude-routine (mode \`${mode}\`) has no live \`in-progress\` issue (a claim whose PR already has an evaluator PASS is queued for your merge, not live) and no eligible \`agent:claude\` issue: every candidate is claimed, assigned, blocked, a payment item, waiting on an open dependency, already has an open PR or \`claude/issue-<n>\` branch, was skipped by the routine with a recorded reason, or carries a \`never_claim\` label (\`needs-triage\`, \`needs-info\`, \`epic\`, ...).`,
    '',
    'This means no new build is possible, not that no action remains: the routine still repairs queued PRs (merge conflicts, failed required checks, evaluator FAIL) and reviews PRs.',
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

async function checkReady(gh, owner, number, trustedLogins, evidenceProvider) {
  const pr = await loadPullRequest(gh, number);
  if (pr.state !== 'open' || pr.draft) return;
  const sha = pr.head.sha;
  const comments = await gh.paginate(`/issues/${number}/comments`);
  const evidence = await evidenceProvider(number);
  const verdict = latestEvaluatorVerdict(comments, sha, { trustedLogins });
  const reviews = await gh.paginate(`/pulls/${number}/reviews`);
  const ready =
    evidence.head === sha && evidence.readiness?.ready === true && assessReadiness({ pr, checks: evidence.checks, verdict, reviews }).ready;
  const reasons = evidence.readiness?.reasons ?? ['independent local verification unavailable'];
  if (!ready) {
    log(`PR #${number} not ready: ${reasons.join('; ')}`);
    return;
  }
  const key = `ready:${sha}:${evidence.base}:${evidence.policy ?? 'husky'}:${evidence.metadata ?? ''}`;
  if (alreadyNotified(comments, key)) {
    log(`PR #${number}: ${key} already notified`);
    return;
  }
  await gh.post(`/issues/${number}/comments`, { body: readyMessage({ owner, pr, verdict, key }) });
  log(`PR #${number}: posted ${key}`);
}

async function checkHarness(gh, owner, number, config) {
  const pr = await gh.get(`/pulls/${number}`);
  if (pr.state !== 'open') return;
  const labels = (pr.labels ?? []).map((label) => label.name);
  const files = await gh.paginate(`/pulls/${number}/files`);
  const touched = protectedFilesTouched(files, config.protectedPaths).filter(
    (entry) => entry.group === 'payments' || !labels.includes('owner-approved-harness'),
  );
  if (!touched.length || !(await isClaudeBuiltPr(gh, pr))) return;
  const key = `harness:${touched.some((entry) => entry.group === 'payments') ? 'payments' : 'factory'}`;
  await postOnce(gh, number, key, harnessMessage({ owner, pr, touched }));
}

// Reads the current label state, so a removed or stale `blocked` never produces a notice.
async function checkBlocked(gh, owner, issue) {
  if (issue.state !== 'open' || !(issue.labels ?? []).some((label) => label.name === 'blocked')) return;
  const comments = await gh.paginate(`/issues/${issue.number}/comments`);
  const human = comments.filter((comment) => comment.user?.login !== BOT_LOGIN);
  const blocker = [...human].reverse().find((comment) => /^\s*##\s*Blocked\b/m.test(comment.body ?? '')) ?? human.at(-1);
  const blockerUrl = blocker?.html_url ?? null;
  const key = `blocked:${blockerUrl ?? issue.number}`;
  if (alreadyNotified(comments, key)) return;
  await gh.post(`/issues/${issue.number}/comments`, { body: blockedMessage({ owner, issue, blockerUrl }) });
  log(`#${issue.number}: posted ${key}`);
}

// Issues an open PR closes, plus those with a claude/issue-<n> branch (run-local
// claude/issue-<n>-run-* branches do not count; the canonical branch always exists).
async function claimedIssueNumbers(gh, prs) {
  const claimed = new Set(prs.flatMap((pr) => closingIssueNumbers(pr.body)));
  for (const ref of await gh.paginate('/git/matching-refs/heads/claude/issue-')) {
    const match = String(ref?.ref ?? '').match(/^refs\/heads\/claude\/issue-(\d+)$/);
    if (match) claimed.add(Number(match[1]));
  }
  return claimed;
}

// Admission is current-context only; historical PASS does not release a WIP slot.
async function queuedClaimNumbers(gh, openIssues, prs, trustedLogins, evidenceProvider) {
  const queued = new Set();
  for (const issue of openIssues) {
    const labels = new Set((issue.labels ?? []).map((entry) => entry.name));
    if (issue.pull_request || !labels.has('agent:claude') || !labels.has('in-progress') || labels.has('blocked')) continue;
    const pr = prs.find((candidate) => candidate.head?.ref === `claude/issue-${issue.number}`);
    if (!pr) continue;
    const evidence = await evidenceProvider(pr.number);
    if (evidence.head === pr.head.sha && evidence.checks?.state === 'success' && evidence.readiness?.ready === true)
      queued.add(issue.number);
  }
  return queued;
}

async function checkQueue(gh, owner, config, openIssues, prs, trustedLogins, evidenceProvider) {
  const tracking = openIssues.find((issue) => issue.title === QUEUE_ISSUE_TITLE && issue.user?.login === BOT_LOGIN);
  const openIssueNumbers = new Set(openIssues.map((issue) => issue.number));
  let state = { idle: false };
  if (config.mode === 'build') {
    const options = {
      neverClaim: config.neverClaim,
      openIssueNumbers,
      claimedNumbers: await claimedIssueNumbers(gh, prs),
      queuedNumbers: await queuedClaimNumbers(gh, openIssues, prs, trustedLogins, evidenceProvider),
    };
    // Only issues that pass the label checks can carry a skip record worth reading.
    const skippedNumbers = new Set();
    for (const issue of claudeQueueState(openIssues, options).eligible) {
      const comments = await gh.paginate(`/issues/${issue.number}/comments`);
      if (hasCurrentSkipRecord(issue, comments, { trustedLogins })) skippedNumbers.add(issue.number);
    }
    state = claudeQueueState(openIssues, { ...options, skippedNumbers });
  }

  if (state.idle && !tracking) {
    const created = await gh.post('/issues', { title: QUEUE_ISSUE_TITLE, body: queueMessage({ owner, mode: config.mode }) });
    log(`Opened #${created.number}: Claude queue is empty`);
  } else if (!state.idle && tracking) {
    await gh.post(`/issues/${tracking.number}/comments`, { body: 'Claude has work again; closing.' });
    await gh.patch(`/issues/${tracking.number}`, { state: 'closed', state_reason: 'completed' });
    log(`Closed #${tracking.number}: Claude has work again`);
  } else {
    log(
      `Claude queue: ${state.idle ? 'idle (already reported)' : `${state.live?.length ?? 0} live, ${state.queued?.length ?? 0} queued, ${state.eligible?.length ?? 0} eligible`}`,
    );
  }
}

// One broken item must not hide the others; the job still fails at the end.
async function guarded(label, task) {
  try {
    await task();
  } catch (error) {
    console.error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

// Every event reconciles the whole repository from current GitHub state instead of
// trusting the event payload. The workflow runs one reconcile at a time, so a dedupe
// read and its write never race, and a superseded queued run loses nothing.
export async function reconcile({
  gh,
  owner,
  config,
  trustedLogins,
  evidenceProvider = (number) => readLocalEvidence(number, { gh, owner, config, trustedLogins }),
}) {
  const prs = await gh.paginate('/pulls?state=open');
  for (const pr of prs) {
    if (pr.draft) continue;
    await guarded(`PR #${pr.number}`, async () => {
      await checkHarness(gh, owner, pr.number, config);
      await checkReady(gh, owner, pr.number, trustedLogins, evidenceProvider);
    });
  }

  const openIssues = await gh.paginate('/issues?state=open');
  for (const issue of openIssues) await guarded(`#${issue.number}`, () => checkBlocked(gh, owner, issue));
  await guarded('Claude queue', () => checkQueue(gh, owner, config, openIssues, prs, trustedLogins, evidenceProvider));
}

export async function handleEvent({ eventName, gh, owner, config, trustedLogins = [owner], evidenceProvider }) {
  log(`Reconciling after ${eventName}.`);
  await reconcile({ gh, owner, config, trustedLogins, evidenceProvider });
}

async function main() {
  throw new Error(
    'The Actions notifier is retired. Existing agent chats surface owner attention; use local-readiness for read-only readiness.',
  );
}

async function printLocalReadiness() {
  const args = process.argv.slice(3);
  const number = Number(args[0]);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error('local-readiness needs a positive PR number.');
  const repoIndex = args.indexOf('--repo');
  const repository = repoIndex < 0 ? 'caraseli02/agent-Commerce' : args[repoIndex + 1];
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw new Error('Invalid repository.');
  const owner = repository.split('/')[0];
  const config = parseFactoryConfig(await readFile(new URL('../.factory/factory.yaml', import.meta.url), 'utf8'));
  const result = await readLocalEvidence(number, { gh: createGhClient(repository), owner, config });
  log(JSON.stringify(result));
}

// `gh issue view <n> --json title,body,labels | node scripts/owner-attention.mjs skip-fingerprint`
// prints the fingerprint the routine puts in a `<!-- claude-skip v=... -->` record.
async function printSkipFingerprint() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  log(issueFingerprint(JSON.parse(input)));
}

// Splits concatenated JSON values (NDJSON, or objects pretty-printed across lines) by
// tracking brace depth outside strings. Throws on input that is not whole JSON values.
function splitJsonValues(text) {
  const values = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth < 0) throw new Error('Unreadable JSON input: unbalanced brackets.');
      if (depth === 0) values.push(JSON.parse(text.slice(start, index + 1)));
    } else if (depth === 0 && !/\s/.test(char)) {
      throw new Error(`Unreadable JSON input: unexpected "${char}".`);
    }
  }
  if (depth !== 0 || inString) throw new Error('Unreadable JSON input: truncated JSON.');
  return values;
}

// Check runs from `gh api .../check-runs --paginate --jq '.check_runs[]'` (one object per
// run, possibly pretty-printed), a JSON array, or the raw `{ check_runs: [...] }` response.
export function parseCheckRuns(text) {
  const values = splitJsonValues(String(text ?? ''));
  return values.flatMap((value) => (Array.isArray(value) ? value : Array.isArray(value?.check_runs) ? value.check_runs : [value]));
}

// Same rule the reconcile applies to a PASS head (`headChecksGreen`): check runs plus the
// combined commit status. Empty input or an empty run list is an error, never `not-green`:
// every real head has check runs, so none means the upstream `gh api` failed.
export function checksGreenVerdict(text, combinedStatus) {
  const runs = parseCheckRuns(text);
  if (!runs.length) throw new Error('No check runs in the input; the upstream gh api call probably failed.');
  return assessChecks(runs, combinedStatus).state === 'success' ? 'green' : 'not-green';
}

// `gh api repos/<repo>/commits/<sha>/status > "$TMPDIR/status.json"` then
// `gh api repos/<repo>/commits/<sha>/check-runs --paginate --jq '.check_runs[]' | node scripts/owner-attention.mjs checks-green --status-file "$TMPDIR/status.json"`
// prints `green` or `not-green` so the routine applies the same queued rule as the reconcile.
// Empty stdin, an empty run list or an unreadable status file exits non-zero with nothing on stdout.
async function printChecksGreen() {
  throw new Error(
    'Hosted checks are retired. Use node scripts/owner-attention.mjs local-readiness PR_NUMBER; require readiness.ready=true.',
  );
}

// Issue comments from `gh api .../issues/<pr>/comments --paginate` (one array per page, or a
// single array) → the PASS heads, resolved by passingEvaluatorHeads so the trust, attribution,
// first-verdict-line and contradiction rules match the reconcile. Empty input is an error:
// a readable API response is at least `[]`.
export function passHeadsFromComments(text, { trustedLogins }) {
  if (!String(text ?? '').trim()) throw new Error('No comments input; the upstream gh api call probably failed.');
  const comments = splitJsonValues(String(text)).flatMap((value) => (Array.isArray(value) ? value : [value]));
  return passingEvaluatorHeads(comments, { trustedLogins });
}

// `gh api repos/<repo>/issues/<pr>/comments --paginate | node scripts/owner-attention.mjs pass-heads --owner <login>`
// prints each PASS head on its own line (nothing when there is none). Trusted evaluator logins
// are EVALUATOR_LOGINS when set, otherwise the owner, exactly as the workflow resolves them.
// Empty or unreadable input exits non-zero with nothing on stdout.
async function printPassHeads() {
  const args = process.argv.slice(3);
  let owner;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--owner' || arg.startsWith('--owner=')) {
      owner = arg === '--owner' ? args[(index += 1)] : arg.slice('--owner='.length);
      if (!owner) throw new Error('--owner needs a login.');
    } else {
      throw new Error(`Unknown pass-heads argument: ${arg}`);
    }
  }
  const trustedLogins = (process.env.EVALUATOR_LOGINS || owner || '')
    .split(',')
    .map((login) => login.trim())
    .filter(Boolean);
  if (!trustedLogins.length) throw new Error('pass-heads needs --owner <login> or EVALUATOR_LOGINS.');
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const heads = passHeadsFromComments(input, { trustedLogins });
  if (heads.length) log(heads.join('\n'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const commands = {
    'skip-fingerprint': printSkipFingerprint,
    'checks-green': printChecksGreen,
    'pass-heads': printPassHeads,
    'local-readiness': printLocalReadiness,
  };
  const run = commands[command] ?? main;
  run().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
}
