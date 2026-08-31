#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { runControllerCycle } from './loop-controller-runtime.mjs';
import { TRUSTED_ASSOCIATIONS, ciPassed, independentReviewPassed } from './loop-signals.mjs';

const USER_HOME = process.env.ECAS_CONTROLLER_HOME ?? homedir();
const REPO = process.env.ECAS_REPO ?? 'caraseli02/Ecas';
const AUTOMATION_ROOT = process.env.ECAS_AUTOMATION_ROOT ?? `${USER_HOME}/.codex/automations/ecas-pr-repair-hook`;
const STATE_PATH = join(AUTOMATION_ROOT, 'state-v3.json');
const SUMMARY_PATH = join(AUTOMATION_ROOT, 'run-summaries-v3.jsonl');
const HEARTBEAT_PATH = join(AUTOMATION_ROOT, 'heartbeat-v3.json');
const LOCK_DIR = join(AUTOMATION_ROOT, 'controller-v3.lock');
const PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
const GH_BIN = process.env.ECAS_GH_BIN ?? '/opt/homebrew/bin/gh';
const GH_TIMEOUT_MS = 20 * 1000;
const LOCK_MAX_AGE_MS = 10 * 60 * 1000;
const HEALTH_MAX_AGE_MS = 15 * 60 * 1000;
const EXPECTED_BASE = 'main';
const OBSERVE_ONLY = process.env.ECAS_LOOP_OBSERVE_ONLY === 'true';

let lockOwner = null;
let lockGeneration = null;

mkdirSync(AUTOMATION_ROOT, { recursive: true });

const nowIso = () => new Date().toISOString();

function assertLockOwner() {
  const lock = !existsSync(LOCK_DIR) ? null : JSON.parse(readFileSync(join(LOCK_DIR, 'owner'), 'utf8'));
  if (!lockOwner || !lock || lock.owner !== lockOwner || lock.generation !== lockGeneration) {
    throw new Error('controller lock ownership was lost; aborting before GitHub mutation');
  }
  utimesSync(LOCK_DIR, new Date(), new Date());
}

function gh(args) {
  if (lockOwner) assertLockOwner();
  return execFileSync(GH_BIN, args, {
    encoding: 'utf8',
    env: { ...process.env, PATH },
    maxBuffer: 32 * 1024 * 1024,
    timeout: GH_TIMEOUT_MS,
  }).trim();
}

function writeHeartbeat(status, details = {}) {
  writeFileSync(
    HEARTBEAT_PATH,
    `${JSON.stringify({ version: 3, status, at: nowIso(), observeOnly: OBSERVE_ONLY, ...details }, null, 2)}\n`,
    {
      mode: 0o600,
    },
  );
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
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    if (Date.now() - statSync(LOCK_DIR).mtimeMs <= LOCK_MAX_AGE_MS) return false;
    try {
      renameSync(LOCK_DIR, `${LOCK_DIR}.stale-${owner}`);
      mkdirSync(LOCK_DIR);
    } catch (recoveryError) {
      if (recoveryError?.code === 'ENOENT' || recoveryError?.code === 'EEXIST') return false;
      throw recoveryError;
    }
  }
  lockGeneration = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  writeFileSync(join(LOCK_DIR, 'owner'), JSON.stringify({ owner, generation: lockGeneration }), { mode: 0o600, flag: 'wx' });
  return owner;
}

function releaseLock(owner) {
  try {
    const lock = JSON.parse(readFileSync(join(LOCK_DIR, 'owner'), 'utf8'));
    if (lock.owner === owner && lock.generation === lockGeneration) rmSync(LOCK_DIR, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
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
      'number,headRefName,headRefOid,baseRefName,closingIssuesReferences,isCrossRepository',
      '--limit',
      '1000',
    ]),
  );
  return pulls.find(
    (pr) =>
      !pr.isCrossRepository &&
      pr.baseRefName === EXPECTED_BASE &&
      pr.headRefName !== EXPECTED_BASE &&
      pr.closingIssuesReferences.some((issue) => issue.number === issueNumber),
  );
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
      'number,state,headRefName,headRefOid,baseRefName,statusCheckRollup,closingIssuesReferences,commits,mergeable,mergeStateStatus',
    ]),
  );
  const metadata = JSON.parse(gh(['api', `repos/${REPO}/pulls/${prNumber}`]));
  let protectedHead = true;
  try {
    protectedHead = JSON.parse(gh(['api', `repos/${REPO}/branches/${encodeURIComponent(state.headRefName)}`])).protected === true;
  } catch {
    // Unknown protection state must fail closed.
  }
  return {
    number: state.number,
    branch: state.headRefName,
    base: state.baseRefName,
    head: state.headRefOid,
    headCommittedAt: state.commits.at(-1)?.committedDate,
    linkedIssues: state.closingIssuesReferences.map((issue) => issue.number),
    checks: state.statusCheckRollup,
    mergeable: state.mergeable,
    mergeStateStatus: state.mergeStateStatus,
    targetSafe:
      state.state === 'OPEN' &&
      state.baseRefName === EXPECTED_BASE &&
      state.headRefName !== EXPECTED_BASE &&
      metadata.head?.repo?.default_branch !== state.headRefName &&
      !protectedHead,
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

const controllerLogin = () => gh(['api', 'user', '--jq', '.login']);

function loadSnapshot(prNumber = null) {
  const active = activeIssues();
  if (active.length !== 1) return { reason: 'no-single-active-issue' };
  const linked = prNumber ? { number: prNumber } : linkedPull(active[0].number);
  if (!linked) return { reason: 'no-linked-open-pr' };
  const pr = pullContext(linked.number);
  return { activeIssues: active, pr, ...collaborationContext(pr.number), controllerLogin: controllerLogin() };
}

function revalidateMutation(action) {
  const current = pullContext(action.pr);
  const claimed = action.issue ? activeIssues() : [];
  if (
    current.head !== action.head ||
    !current.targetSafe ||
    current.mergeable === 'CONFLICTING' ||
    current.mergeStateStatus === 'DIRTY' ||
    (action.issue && (claimed.length !== 1 || claimed[0]?.number !== action.issue || !current.linkedIssues.includes(action.issue)))
  ) {
    throw new Error('PR head, target safety, or WIP claim changed before GitHub mutation');
  }
  return current;
}

function repairEvidence(signal) {
  if (signal.kind !== 'ci-failure') return signal.instruction ?? '';
  try {
    return gh(['run', 'view', signal.sourceId, '--repo', REPO, '--log-failed']).slice(-8_000);
  } catch {
    return 'CI failed, but GitHub returned no failed-step log. Inspect the current repository checks.';
  }
}

function postDispatch(pr, body, expectedHead, issue) {
  revalidateMutation({ pr, head: expectedHead, issue });
  const bodyPath = join(AUTOMATION_ROOT, `dispatch-${Date.now()}-pr${pr}.md`);
  writeFileSync(bodyPath, body, { mode: 0o600 });
  try {
    return gh(['pr', 'comment', String(pr), '--repo', REPO, '--body-file', bodyPath]);
  } finally {
    rmSync(bodyPath, { force: true });
  }
}

function blockIssue(action) {
  revalidateMutation(action);
  gh([
    'issue',
    'comment',
    String(action.issue),
    '--repo',
    REPO,
    '--body',
    `The hosted repair-attempt limit (${action.attempts}) was reached for PR #${action.pr} at \`${action.head}\` after the final in-flight window expired. Review the compact run summaries and repair the branch manually before unblocking the issue.`,
  ]);
  revalidateMutation(action);
  gh(['issue', 'edit', String(action.issue), '--repo', REPO, '--remove-label', 'in-progress', '--add-label', 'blocked']);
}

function promoteIssue(action) {
  let current = revalidateMutation(action);
  let collaboration = collaborationContext(action.pr);
  if (
    current.mergeable !== 'MERGEABLE' ||
    current.mergeStateStatus !== 'CLEAN' ||
    !ciPassed(current.checks) ||
    !independentReviewPassed({ pr: current, ...collaboration })
  ) {
    throw new Error('PR lost a promotion gate before ready-for-human mutation');
  }
  gh(['issue', 'edit', String(action.issue), '--repo', REPO, '--remove-label', 'in-progress', '--add-label', 'ready-for-human']);
  current = pullContext(action.pr);
  collaboration = collaborationContext(action.pr);
  if (
    current.head !== action.head ||
    current.mergeable !== 'MERGEABLE' ||
    current.mergeStateStatus !== 'CLEAN' ||
    !ciPassed(current.checks) ||
    !independentReviewPassed({ pr: current, ...collaboration })
  ) {
    gh(['issue', 'edit', String(action.issue), '--repo', REPO, '--remove-label', 'ready-for-human', '--add-label', 'in-progress']);
    throw new Error('PR promotion gates changed; ready-for-human was rolled back');
  }
}

const github = {
  loadSnapshot,
  refreshSnapshot: loadSnapshot,
  repairEvidence,
  postDispatch,
  blockIssue,
  promoteIssue,
};

function run({ observeOnly = OBSERVE_ONLY } = {}) {
  return runControllerCycle({ github, statePath: STATE_PATH, summaryPath: SUMMARY_PATH, observeOnly, now: nowIso });
}

if (process.argv.includes('--health')) {
  const result = health();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.status === 'healthy' ? 0 : 1);
}

if (process.argv.includes('--inspect')) {
  process.stdout.write(`${JSON.stringify(run({ observeOnly: true }), null, 2)}\n`);
  process.exit(0);
}

lockOwner = acquireLock();
if (!lockOwner) process.exit(0);
try {
  writeHeartbeat('running');
  const action = run();
  writeHeartbeat('healthy', { lastAction: action.type, reason: action.reason });
  process.stdout.write(`${JSON.stringify(action, null, 2)}\n`);
} catch (error) {
  writeHeartbeat('failed', { error: error instanceof Error ? error.message : String(error) });
  throw error;
} finally {
  releaseLock(lockOwner);
}
