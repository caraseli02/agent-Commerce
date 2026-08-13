#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { decideNextAction } from './loop-policy.mjs';
import { TRUSTED_ASSOCIATIONS } from './loop-signals.mjs';
import { appendRunSummary } from './loop-run-summary.mjs';
import { beginDispatch, finishDispatch, readLoopState, writeLoopState } from './loop-state.mjs';

const USER_HOME = process.env.ECAS_CONTROLLER_HOME ?? homedir();
const REPO = process.env.ECAS_REPO ?? 'caraseli02/Ecas';
const AUTOMATION_ROOT = process.env.ECAS_AUTOMATION_ROOT ?? `${USER_HOME}/.codex/automations/ecas-pr-repair-hook`;
const STATE_PATH = join(AUTOMATION_ROOT, 'state-v3.json');
const SUMMARY_PATH = join(AUTOMATION_ROOT, 'run-summaries-v3.jsonl');
const HEARTBEAT_PATH = join(AUTOMATION_ROOT, 'heartbeat-v3.json');
const LOCK_DIR = join(AUTOMATION_ROOT, 'controller-v3.lock');
const PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
const LOCK_MAX_AGE_MS = 10 * 60 * 1000;
const HEALTH_MAX_AGE_MS = 15 * 60 * 1000;
const GH_TIMEOUT_MS = 20 * 1000;
const REPAIR_TIMEOUT_MS = 20 * 60 * 1000;
const REPAIR_OUTPUT_LIMIT = 2 * 1024 * 1024;
const REPO_ROOT = process.env.ECAS_REPO_ROOT ?? process.cwd();
const CODEX_BIN = process.env.ECAS_CODEX_BIN ?? '/Applications/ChatGPT.app/Contents/Resources/codex';
let lockOwner = null;

mkdirSync(AUTOMATION_ROOT, { recursive: true });

const nowIso = () => new Date().toISOString();
const gh = (args) => {
  if (lockOwner) assertLockOwner();
  if (existsSync(LOCK_DIR)) utimesSync(LOCK_DIR, new Date(), new Date());
  return execFileSync('/opt/homebrew/bin/gh', args, {
    encoding: 'utf8',
    env: { ...process.env, PATH },
    maxBuffer: 32 * 1024 * 1024,
    timeout: GH_TIMEOUT_MS,
  }).trim();
};

const git = (args, options = {}) => {
  if (lockOwner) assertLockOwner();
  return execFileSync('/usr/bin/git', args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: 'utf8',
    env: { PATH },
    timeout: GH_TIMEOUT_MS,
  }).trim();
};

function writeHeartbeat(status, details = {}) {
  writeFileSync(HEARTBEAT_PATH, `${JSON.stringify({ version: 3, status, at: nowIso(), ...details }, null, 2)}\n`, {
    mode: 0o600,
  });
}

function health() {
  if (!existsSync(HEARTBEAT_PATH)) return { status: 'missing' };
  const heartbeat = JSON.parse(readFileSync(HEARTBEAT_PATH, 'utf8'));
  const ageMs = Date.now() - new Date(heartbeat.at).getTime();
  if (heartbeat.status === 'failed') return { status: 'failed', ageMs, heartbeat };
  return { status: ageMs <= HEALTH_MAX_AGE_MS ? 'healthy' : 'stale', ageMs, heartbeat };
}

function acquireLock() {
  const owner = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    mkdirSync(LOCK_DIR);
    writeFileSync(join(LOCK_DIR, 'owner'), owner, { mode: 0o600, flag: 'wx' });
    return owner;
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    if (Date.now() - statSync(LOCK_DIR).mtimeMs <= LOCK_MAX_AGE_MS) return false;
    // Atomically move the stale lock away. Never recursively remove the path:
    // a recovering controller must not delete a lock acquired by a peer.
    try {
      renameSync(LOCK_DIR, `${LOCK_DIR}.stale-${owner}`);
    } catch (recoveryError) {
      if (recoveryError?.code === 'ENOENT' || recoveryError?.code === 'EEXIST') return false;
      throw recoveryError;
    }
    try {
      mkdirSync(LOCK_DIR);
      writeFileSync(join(LOCK_DIR, 'owner'), owner, { mode: 0o600, flag: 'wx' });
      return owner;
    } catch (recoveryError) {
      if (recoveryError?.code === 'EEXIST') return false;
      throw recoveryError;
    }
  }
}

const releaseLock = (owner) => {
  try {
    if (readFileSync(join(LOCK_DIR, 'owner'), 'utf8') === owner) rmSync(LOCK_DIR, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
};

function assertLockOwner() {
  if (!lockOwner || !existsSync(LOCK_DIR) || readFileSync(join(LOCK_DIR, 'owner'), 'utf8') !== lockOwner) {
    throw new Error('controller lock ownership was lost; aborting before external mutation or execution');
  }
  utimesSync(LOCK_DIR, new Date(), new Date());
}
const paginated = (endpoint) => JSON.parse(gh(['api', '--paginate', '--slurp', endpoint])).flat();

function activeIssues() {
  return paginated(`repos/${REPO}/issues?state=open&labels=in-progress&per_page=100`).filter((issue) => !issue.pull_request);
}

function linkedPull(issueNumber) {
  const pulls = JSON.parse(
    gh([
      'pr',
      'list',
      '--repo',
      REPO,
      '--state',
      'open',
      '--json',
      'number,headRefName,headRefOid,closingIssuesReferences,isCrossRepository',
      '--limit',
      '1000',
    ])
  );
  return pulls.find((pr) => !pr.isCrossRepository && pr.closingIssuesReferences.some((issue) => issue.number === issueNumber));
}

function pullContext(prNumber) {
  const state = JSON.parse(
    gh([
      'pr',
      'view',
      String(prNumber),
      '--repo',
      REPO,
      '--json',
      'number,headRefName,headRefOid,statusCheckRollup,closingIssuesReferences,commits,mergeable,mergeStateStatus',
    ])
  );
  const metadata = JSON.parse(gh(['api', `repos/${REPO}/pulls/${prNumber}`]));
  return {
    number: state.number,
    branch: state.headRefName,
    head: state.headRefOid,
    headCommittedAt: state.commits.at(-1)?.committedDate,
    linkedIssues: state.closingIssuesReferences.map((issue) => issue.number),
    checks: state.statusCheckRollup,
    mergeable: state.mergeable,
    mergeStateStatus: state.mergeStateStatus,
    trustedAuthor:
      TRUSTED_ASSOCIATIONS.has(metadata.author_association) && metadata.head?.repo?.full_name?.toLowerCase() === REPO.toLowerCase(),
  };
}

function collaborationContext(pr) {
  return {
    issueComments: paginated(`repos/${REPO}/issues/${pr}/comments?per_page=100`),
    reviews: paginated(`repos/${REPO}/pulls/${pr}/reviews?per_page=100`),
    reviewComments: paginated(`repos/${REPO}/pulls/${pr}/comments?per_page=100`),
  };
}

function dispatchRepair({ action, pr, state }) {
  const startedAt = nowIso();
  beginDispatch(state, { pr: pr.number, key: action.signal.key, head: pr.head, at: startedAt });
  writeLoopState(STATE_PATH, state);
  let result = 'failed';
  let worktree = null;
  try {
    if (!revalidateHead(action, pr)) return false;
    worktree = mkdtempSync(join(AUTOMATION_ROOT, `repair-pr${pr.number}-`));
    git(['fetch', '--no-tags', 'origin', pr.branch]);
    git(['worktree', 'add', '--detach', worktree, pr.head]);
    const prompt = `Repair PR #${pr.number} only at head ${pr.head}. Source: ${action.signal.kind} ${action.signal.sourceUrl}. Read AGENTS.md. Make the smallest safe fix and focused tests. Do not use network, gh, commit, push, merge, or read secrets. Stop if stale or ambiguous.`;
    assertLockOwner();
    const child = spawnSync(CODEX_BIN, ['exec', '--sandbox', 'workspace-write', '--cd', worktree, prompt], {
      cwd: worktree,
      env: { PATH, HOME: worktree, TMPDIR: join(worktree, '.tmp') },
      encoding: 'utf8',
      timeout: REPAIR_TIMEOUT_MS,
      maxBuffer: REPAIR_OUTPUT_LIMIT,
    });
    if (child.error || child.status !== 0 || child.signal)
      throw new Error(`local repair stopped: ${child.error?.message ?? child.signal ?? child.status}`);
    if (!revalidateHead(action, pr)) return false;
    if (!git(['status', '--porcelain'], { cwd: worktree })) throw new Error('local repair completed without a change');
    git(['-c', 'core.hooksPath=/dev/null', 'add', '-A'], { cwd: worktree });
    git(['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgSign=false', 'commit', '-m', `Automated repair: ${action.signal.kind}`], {
      cwd: worktree,
    });
    const repairedHead = git(['rev-parse', 'HEAD'], { cwd: worktree });
    // Persist the irrevocable local success before publishing it, so recovery
    // reserves this attempt even if the process dies immediately after push.
    finishDispatch(state, { key: action.signal.key, result: 'dispatched', at: nowIso() });
    state.dispatches[action.signal.key].preparedHead = repairedHead;
    writeLoopState(STATE_PATH, state);
    assertLockOwner();
    git(['push', 'origin', `HEAD:${pr.branch}`], { cwd: worktree });
    state.dispatches[action.signal.key].publishedHead = repairedHead;
    writeLoopState(STATE_PATH, state);
    result = 'dispatched';
    return true;
  } catch (error) {
    state.dispatches[action.signal.key].error = String(error.message ?? error).slice(0, 1000);
    return false;
  } finally {
    const completedAt = nowIso();
    if (state.dispatches[action.signal.key]?.result === 'running')
      finishDispatch(state, { key: action.signal.key, result, at: completedAt });
    writeLoopState(STATE_PATH, state);
    if (worktree) {
      try {
        git(['worktree', 'remove', '--force', worktree]);
      } catch {
        rmSync(worktree, { recursive: true, force: true });
      }
    }
    appendRunSummary(SUMMARY_PATH, {
      version: 2,
      role: 'local-repair',
      pr: pr.number,
      issue: action.issue,
      head: pr.head,
      sourceKey: action.signal.key,
      startedAt,
      completedAt,
      result,
      localOnly: true,
    });
  }
}

function blockIssue(action, state) {
  const attempts = Math.max(Number(action.attempts ?? 0), Number(state.attemptsByPr?.[action.pr] ?? 0), 0);
  const reason =
    action.reason === 'local-push-unreconciled'
      ? 'A local repair was committed but its push could not be reconciled after interruption. Compare the saved local run summary with the PR head; then either push or manually resolve before unblocking.'
      : `The local repair-attempt limit (${attempts}) was reached. Review the local run summary and source evidence, then fix the branch manually or remove \`blocked\` and provide an exact-head \`/repair <40-char-sha> <instruction>\` command.`;
  const pending = action.signal
    ? ` Pending source: ${action.signal.key} (${action.signal.sourceUrl}); observed head: \`${action.head}\`.`
    : ` Observed head: \`${action.head}\`.`;
  if (!revalidateHead(action, { head: action.head })) return false;
  gh([
    'issue',
    'comment',
    String(action.issue),
    '--repo',
    REPO,
    '--body',
    `The linked PR remains blocked for human attention. ${reason}${pending}`,
  ]);
  if (!revalidateHead(action, { head: action.head })) return false;
  gh(['issue', 'edit', String(action.issue), '--repo', REPO, '--remove-label', 'in-progress', '--add-label', 'blocked']);
  return true;
}

function revalidateHead(action, observedPr) {
  assertLockOwner();
  const current = pullContext(action.pr);
  return current.head === observedPr.head && current.mergeable !== 'CONFLICTING' && current.mergeStateStatus !== 'DIRTY';
}

function loadDecision() {
  const issues = activeIssues();
  if (issues.length !== 1) return { action: { type: 'idle', reason: 'no-single-active-issue' } };
  const linked = linkedPull(issues[0].number);
  if (!linked) return { action: { type: 'idle', reason: 'no-linked-open-pr' } };
  const pr = pullContext(linked.number);
  const state = readLoopState(STATE_PATH);
  const action = decideNextAction({ state, activeIssues: issues, pr, ...collaborationContext(pr.number) });
  return { action, pr, state };
}

function main() {
  const { action, pr, state } = loadDecision();
  if (action.type === 'idle') return action;
  if (!revalidateHead(action, pr)) return { type: 'idle', reason: 'head-or-mergeability-changed' };
  if (action.type === 'dispatch') dispatchRepair({ action, pr, state });
  if (action.type === 'ready') {
    if (!revalidateHead(action, pr) || pr.mergeable !== 'MERGEABLE' || pr.mergeStateStatus !== 'CLEAN')
      return { type: 'idle', reason: 'head-or-mergeability-changed' };
    assertLockOwner();
    gh(['issue', 'edit', String(action.issue), '--repo', REPO, '--remove-label', 'in-progress', '--add-label', 'ready-for-human']);
  }
  if (action.type === 'blocked') blockIssue(action, state);
  return action;
}

if (process.argv.includes('--health')) {
  const result = health();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.status === 'healthy' ? 0 : 1);
}

if (process.argv.includes('--inspect')) {
  process.stdout.write(`${JSON.stringify(loadDecision().action, null, 2)}\n`);
  process.exit(0);
}

lockOwner = acquireLock();
if (!lockOwner) process.exit(0);
try {
  writeHeartbeat('running');
  const action = main();
  writeHeartbeat('healthy', { lastAction: action.type, reason: action.reason });
  process.stdout.write(`${JSON.stringify(action, null, 2)}\n`);
} catch (error) {
  writeHeartbeat('failed', { error: error instanceof Error ? error.message : String(error) });
  throw error;
} finally {
  releaseLock(lockOwner);
}
