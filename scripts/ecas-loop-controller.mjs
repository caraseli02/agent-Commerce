#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import {
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

import { runControllerCycle } from './loop-controller-runtime.mjs';
import { TRUSTED_ASSOCIATIONS, ciPassed, independentReviewPassed } from './loop-signals.mjs';
import { repairPrompt, sandboxProfile, startResponsesProxy, validateChangeSize } from './loop-worker.mjs';

const USER_HOME = process.env.ECAS_CONTROLLER_HOME ?? homedir();
const REPO = process.env.ECAS_REPO ?? 'caraseli02/Ecas';
const AUTOMATION_ROOT = process.env.ECAS_AUTOMATION_ROOT ?? `${USER_HOME}/.codex/automations/ecas-pr-repair-hook`;
const STATE_PATH = join(AUTOMATION_ROOT, 'state-v3.json');
const SUMMARY_PATH = join(AUTOMATION_ROOT, 'run-summaries-v3.jsonl');
const HEARTBEAT_PATH = join(AUTOMATION_ROOT, 'heartbeat-v3.json');
const LOCK_DIR = join(AUTOMATION_ROOT, 'controller-v3.lock');
const PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
const GH_BIN = process.env.ECAS_GH_BIN ?? '/opt/homebrew/bin/gh';
const CODEX_BIN = process.env.ECAS_CODEX_BIN ?? '/Applications/ChatGPT.app/Contents/Resources/codex';
const REPO_ROOT = process.env.ECAS_REPO_ROOT ?? process.cwd();
const WORKER_MODEL = process.env.ECAS_WORKER_MODEL ?? 'gpt-5.4-mini';
const KEYCHAIN_SERVICE = process.env.ECAS_WORKER_KEYCHAIN_SERVICE ?? 'ecas-loop-openai-api-key';
const KEYCHAIN_ACCOUNT = process.env.ECAS_WORKER_KEYCHAIN_ACCOUNT ?? 'openai';
const GH_TIMEOUT_MS = 20 * 1000;
const WORKER_TIMEOUT_MS = 20 * 60 * 1000;
const LOCK_MAX_AGE_MS = 25 * 60 * 1000;
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

function loadSnapshot(prNumber = null) {
  const active = activeIssues();
  if (active.length !== 1) return { reason: 'no-single-active-issue' };
  const linked = prNumber ? { number: prNumber } : linkedPull(active[0].number);
  if (!linked) return { reason: 'no-linked-open-pr' };
  const pr = pullContext(linked.number);
  return { activeIssues: active, pr, ...collaborationContext(pr.number) };
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

function blockIssue(action) {
  revalidateMutation(action);
  gh([
    'issue',
    'comment',
    String(action.issue),
    '--repo',
    REPO,
    '--body',
    `The local repair-attempt limit (${action.attempts}) was reached for PR #${action.pr} at \`${action.head}\`. Review the compact run summaries and repair the branch manually before unblocking the issue.`,
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

function git(args, options = {}) {
  return execFileSync('/usr/bin/git', ['-C', REPO_ROOT, ...args], {
    encoding: 'utf8',
    env: { PATH },
    maxBuffer: 32 * 1024 * 1024,
    timeout: options.timeout ?? 2 * 60 * 1000,
  }).trim();
}

function keychainApiKey() {
  const value = execFileSync('/usr/bin/security', ['find-generic-password', '-a', KEYCHAIN_ACCOUNT, '-s', KEYCHAIN_SERVICE, '-w'], {
    encoding: 'utf8',
    env: { PATH },
    timeout: 10_000,
  }).trim();
  if (!value) throw new Error(`Keychain item ${KEYCHAIN_SERVICE}/${KEYCHAIN_ACCOUNT} is empty`);
  return value;
}

function runSandboxedWorker({ worktree, runtimeRoot, profilePath, proxy, prompt }) {
  const outputPath = join(runtimeRoot, 'last-message.txt');
  const args = [
    '-f',
    profilePath,
    CODEX_BIN,
    'exec',
    '--ephemeral',
    '--ignore-user-config',
    '--ignore-rules',
    '--strict-config',
    '--sandbox',
    'workspace-write',
    '--cd',
    worktree,
    '--model',
    WORKER_MODEL,
    '--output-last-message',
    outputPath,
    '-c',
    'approval_policy="never"',
    '-c',
    'model_provider="ecas_proxy"',
    '-c',
    'model_providers.ecas_proxy.name="ECAS local proxy"',
    '-c',
    `model_providers.ecas_proxy.base_url=${JSON.stringify(proxy.baseUrl)}`,
    '-c',
    'model_providers.ecas_proxy.env_key="ECAS_PROXY_TOKEN"',
    '-c',
    'model_providers.ecas_proxy.wire_api="responses"',
    '-c',
    'shell_environment_policy.inherit="none"',
    '-c',
    `shell_environment_policy.set={ PATH=${JSON.stringify(PATH)}, HOME=${JSON.stringify(worktree)}, TMPDIR=${JSON.stringify(runtimeRoot)} }`,
    '-c',
    'allow_login_shell=false',
    '-c',
    'sandbox_workspace_write.network_access=false',
    prompt,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/sandbox-exec', args, {
      cwd: worktree,
      env: {
        PATH,
        HOME: worktree,
        CODEX_HOME: runtimeRoot,
        TMPDIR: runtimeRoot,
        ECAS_PROXY_TOKEN: proxy.token,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const collect = (chunk) => {
      output = `${output}${chunk}`.slice(-16_000);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const heartbeat = setInterval(() => lockOwner && assertLockOwner(), 60_000);
    let forceKill = null;
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      forceKill = setTimeout(() => child.kill('SIGKILL'), 5_000);
    }, WORKER_TIMEOUT_MS);
    child.once('error', reject);
    child.once('close', (code, signal) => {
      clearInterval(heartbeat);
      clearTimeout(timeout);
      if (forceKill) clearTimeout(forceKill);
      if (code === 0) resolve();
      else reject(new Error(`local Codex worker failed (${signal ?? code}): ${output.slice(-2_000)}`));
    });
  });
}

const worker = {
  async repair({ action, pr, evidence }) {
    revalidateMutation(action);
    const root = mkdtempSync(join(tmpdir(), `ecas-loop-pr${pr.number}-`));
    const worktree = join(root, 'worktree');
    const runtimeRoot = join(root, 'runtime');
    mkdirSync(runtimeRoot, { mode: 0o700 });
    let proxy = null;
    let apiKey = null;
    try {
      git(['fetch', '--no-tags', 'origin', pr.branch]);
      revalidateMutation(action);
      git(['worktree', 'add', '--detach', worktree, pr.head]);
      const gitPointer = readFileSync(join(worktree, '.git'), 'utf8');
      const gitRoot = git(['rev-parse', '--path-format=absolute', '--git-common-dir']);
      const sourceModules = join(REPO_ROOT, 'node_modules');
      if (existsSync(sourceModules)) {
        cpSync(sourceModules, join(worktree, 'node_modules'), {
          recursive: true,
          mode: constants.COPYFILE_FICLONE,
          preserveTimestamps: true,
        });
      }
      const profilePath = join(runtimeRoot, 'worker.sb');
      writeFileSync(profilePath, sandboxProfile({ worktree, runtimeRoot, gitRoot, codexBin: CODEX_BIN }), { mode: 0o600 });
      apiKey = keychainApiKey();
      proxy = await startResponsesProxy(apiKey);
      await runSandboxedWorker({
        worktree,
        runtimeRoot,
        profilePath,
        proxy,
        prompt: repairPrompt({ action, pr, evidence }),
      });
      if (readFileSync(join(worktree, '.git'), 'utf8') !== gitPointer) throw new Error('worker altered the worktree Git pointer');
      revalidateMutation(action);
      const status = execFileSync('/usr/bin/git', ['-C', worktree, 'status', '--porcelain'], {
        encoding: 'utf8',
        env: { PATH },
      }).trim();
      if (!status) throw new Error('local worker produced no repair');
      execFileSync('/usr/bin/git', ['-C', worktree, 'diff', '--check'], { env: { PATH } });
      execFileSync('/usr/bin/git', ['-C', worktree, 'add', '--all'], { env: { PATH } });
      const stagedDiff = execFileSync('/usr/bin/git', ['-C', worktree, 'diff', '--cached'], {
        encoding: 'utf8',
        env: { PATH },
        maxBuffer: 8 * 1024 * 1024,
      });
      if (apiKey && stagedDiff.includes(apiKey)) throw new Error('worker output contained the controller API credential');
      validateChangeSize(
        execFileSync('/usr/bin/git', ['-C', worktree, 'diff', '--cached', '--numstat'], { encoding: 'utf8', env: { PATH } }),
      );
      execFileSync(
        '/usr/bin/git',
        [
          '-C',
          worktree,
          '-c',
          'commit.gpgsign=false',
          '-c',
          'core.hooksPath=/dev/null',
          'commit',
          '-m',
          `fix: apply local repair for PR #${pr.number}`,
        ],
        { env: { ...process.env, PATH }, stdio: 'ignore' },
      );
      const publishedHead = execFileSync('/usr/bin/git', ['-C', worktree, 'rev-parse', 'HEAD'], {
        encoding: 'utf8',
        env: { PATH },
      }).trim();
      revalidateMutation(action);
      execFileSync(
        '/usr/bin/git',
        ['-C', worktree, 'push', `--force-with-lease=refs/heads/${pr.branch}:${action.head}`, 'origin', `HEAD:${pr.branch}`],
        {
          env: { ...process.env, PATH },
          timeout: 2 * 60 * 1000,
        },
      );
      return { publishedHead };
    } finally {
      if (proxy) await proxy.close();
      try {
        if (existsSync(worktree)) git(['worktree', 'remove', '--force', worktree]);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  },
};

const github = {
  loadSnapshot,
  refreshSnapshot: loadSnapshot,
  repairEvidence,
  blockIssue,
  promoteIssue,
};

async function run({ observeOnly = OBSERVE_ONLY } = {}) {
  return runControllerCycle({ github, worker, statePath: STATE_PATH, summaryPath: SUMMARY_PATH, observeOnly, now: nowIso });
}

if (process.argv.includes('--health')) {
  const result = health();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.status === 'healthy' ? 0 : 1);
}

if (process.argv.includes('--inspect')) {
  process.stdout.write(`${JSON.stringify(await run({ observeOnly: true }), null, 2)}\n`);
  process.exit(0);
}

lockOwner = acquireLock();
if (!lockOwner) process.exit(0);
try {
  writeHeartbeat('running');
  const action = await run();
  writeHeartbeat('healthy', { lastAction: action.type, reason: action.reason });
  process.stdout.write(`${JSON.stringify(action, null, 2)}\n`);
} catch (error) {
  writeHeartbeat('failed', { error: error instanceof Error ? error.message : String(error) });
  throw error;
} finally {
  releaseLock(lockOwner);
}
