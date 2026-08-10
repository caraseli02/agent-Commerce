#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, relative } from 'node:path';

import { normalizeEvaluation } from './loop-evaluation.mjs';
import { decideNextAction } from './loop-policy.mjs';
import { appendRunSummary, buildRunSummary } from './loop-run-summary.mjs';
import { beginEvaluation, beginRepair, canRepair, finishEvaluation, finishRepair, readLoopState, writeLoopState } from './loop-state.mjs';

const USER_HOME = process.env.ECAS_CONTROLLER_HOME ?? homedir();
const REPO = process.env.ECAS_REPO ?? 'caraseli02/Ecas';
const REPO_ROOT = process.env.ECAS_REPO_ROOT ?? `${USER_HOME}/Documents/Ecas`;
const CODEX_HOME = process.env.CODEX_HOME ?? `${USER_HOME}/.codex`;
const CODEX_BIN = process.env.ECAS_CODEX_BIN ?? '/Applications/ChatGPT.app/Contents/Resources/codex';
const AUTOMATION_ROOT = process.env.ECAS_AUTOMATION_ROOT ?? `${CODEX_HOME}/automations/ecas-pr-repair-hook`;
const RUNS_DIR = join(AUTOMATION_ROOT, 'runs');
const STATE_PATH = join(AUTOMATION_ROOT, 'state-v2.json');
const SUMMARY_PATH = join(AUTOMATION_ROOT, 'run-summaries.jsonl');
const HEARTBEAT_PATH = join(AUTOMATION_ROOT, 'heartbeat-v2.json');
const LOCK_DIR = join(AUTOMATION_ROOT, 'controller-v2.lock');
const EVALUATOR_SCHEMA_PATH = join(AUTOMATION_ROOT, 'evaluator-result-v2.schema.json');
const PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
const LOCK_MAX_AGE_MS = 30 * 60 * 1000;
const HEALTH_MAX_AGE_MS = 15 * 60 * 1000;

mkdirSync(RUNS_DIR, { recursive: true });

const nowIso = () => new Date().toISOString();
const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, PATH },
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  }).trim();
const gh = (args, options = {}) => run('/opt/homebrew/bin/gh', args, options);
const git = (args, options = {}) => run('/usr/bin/git', args, options);

function writeHeartbeat(status, details = {}) {
  writeFileSync(HEARTBEAT_PATH, `${JSON.stringify({ version: 2, status, at: nowIso(), ...details }, null, 2)}\n`, {
    mode: 0o600,
  });
}

function health() {
  if (!existsSync(HEARTBEAT_PATH)) return { status: 'missing' };
  const heartbeat = JSON.parse(readFileSync(HEARTBEAT_PATH, 'utf8'));
  const ageMs = Date.now() - new Date(heartbeat.at).getTime();
  return { status: ageMs <= HEALTH_MAX_AGE_MS ? 'healthy' : 'stale', ageMs, heartbeat };
}

function acquireLock() {
  try {
    mkdirSync(LOCK_DIR);
    return true;
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    if (Date.now() - statSync(LOCK_DIR).mtimeMs <= LOCK_MAX_AGE_MS) return false;
    rmSync(LOCK_DIR, { recursive: true, force: true });
    mkdirSync(LOCK_DIR);
    return true;
  }
}

const releaseLock = () => rmSync(LOCK_DIR, { recursive: true, force: true });

function paginated(endpoint) {
  return JSON.parse(gh(['api', '--paginate', '--slurp', endpoint])).flat();
}

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
  return {
    number: state.number,
    branch: state.headRefName,
    head: state.headRefOid,
    headCommittedAt: state.commits.at(-1)?.committedDate,
    linkedIssues: state.closingIssuesReferences.map((issue) => issue.number),
    checks: state.statusCheckRollup,
    mergeable: state.mergeable,
    mergeStateStatus: state.mergeStateStatus,
  };
}

function collaborationContext(pr) {
  return {
    issueComments: paginated(`repos/${REPO}/issues/${pr}/comments?per_page=100`),
    reviews: paginated(`repos/${REPO}/pulls/${pr}/reviews?per_page=100`),
    reviewComments: paginated(`repos/${REPO}/pulls/${pr}/comments?per_page=100`),
  };
}

function prepareWorktree(pr, head, role, runId) {
  const directory = `${CODEX_HOME}/worktrees/ecas-pr-${pr}-${role}-${runId}`;
  const ref = `refs/remotes/origin/ecas-pr-${pr}-${head.slice(0, 12)}`;
  git(['fetch', '--no-tags', 'origin', `+refs/pull/${pr}/head:${ref}`]);
  git(['worktree', 'add', '--detach', directory, head]);
  return directory;
}

function removeWorktree(directory) {
  if (!directory) return;
  try {
    git(['worktree', 'remove', '--force', directory]);
  } catch (error) {
    process.stderr.write(`Failed to remove worktree ${directory}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

function bodyFile(name, body) {
  const path = join(RUNS_DIR, name);
  writeFileSync(path, body, { mode: 0o600 });
  return path;
}

function postComment(pr, name, body) {
  return gh(['pr', 'comment', String(pr), '--repo', REPO, '--body-file', bodyFile(name, body)]);
}

function runCodex({ role, pr, worktree, prompt, sandbox = 'danger-full-access', outputSchema = null }) {
  const runId = `${Date.now()}-pr${pr}-${role}`;
  const tracePath = join(RUNS_DIR, `${runId}.jsonl`);
  const resultPath = join(RUNS_DIR, `${runId}-result.txt`);
  const startedAt = nowIso();
  const args = [
    'exec',
    '--json',
    '--sandbox',
    sandbox,
    '--cd',
    worktree,
    '-c',
    'model_reasoning_effort="high"',
    '--output-last-message',
    resultPath,
  ];
  if (outputSchema) args.push('--output-schema', outputSchema);
  args.push(prompt);
  const output = spawnSync(CODEX_BIN, args, {
    cwd: worktree,
    env: { ...process.env, PATH },
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  const events = `${output.stdout ?? ''}${output.stderr ?? ''}`;
  writeFileSync(tracePath, events, { mode: 0o600 });
  return {
    runId,
    role,
    pr,
    startedAt,
    completedAt: nowIso(),
    succeeded: output.status === 0,
    message: existsSync(resultPath) ? readFileSync(resultPath, 'utf8').trim() : '',
    tracePath,
    events,
  };
}

function recordRun(runResult, { issue, head, sourceKey, result }) {
  appendRunSummary(
    SUMMARY_PATH,
    buildRunSummary({
      ...runResult,
      issue,
      head,
      sourceKey,
      result,
      tracePath: relative(AUTOMATION_ROOT, runResult.tracePath),
    })
  );
}

function controllerFailureRun(role, pr, error) {
  const runId = `${Date.now()}-pr${pr}-${role}-controller-failure`;
  const tracePath = join(RUNS_DIR, `${runId}.jsonl`);
  const at = nowIso();
  const message = error instanceof Error ? error.message : String(error);
  const events = `${JSON.stringify({ type: 'controller.error', message })}\n`;
  writeFileSync(tracePath, events, { mode: 0o600 });
  return { runId, role, pr, startedAt: at, completedAt: at, succeeded: false, message, tracePath, events };
}

function blockIssue(issue) {
  gh(['issue', 'edit', String(issue), '--repo', REPO, '--remove-label', 'in-progress', '--add-label', 'blocked']);
}

function repairPrompt({ pr, issue, branch, head, signal }) {
  const instruction = signal.instruction ? `\nRequested instruction: ${signal.instruction}` : '';
  return `You are the ECAS repair agent for PR #${pr}, linked issue #${issue}.

Repair source: ${signal.kind}
Source URL: ${signal.sourceUrl}
Current head: ${head}${instruction}

Read AGENTS.md and the linked issue/PR. Inspect the source evidence with gh, make only the smallest relevant fix, run the narrowest useful check and then pnpm verify when feasible, commit, and push with: git push origin HEAD:${branch}.

Limits: at most two focused implementation attempts. Never merge, close, approve, force-push, change unrelated files, weaken tests, or broaden scope. If the request is unsafe, stale, ambiguous, or needs a human decision, stop and explain the blocker in the final message.`;
}

function evaluatorPrompt({ pr, issue, head }) {
  return `You are the independent ECAS evaluator for PR #${pr}, linked issue #${issue}, at head ${head}.

Read AGENTS.md, the issue, PR, diff, CI evidence, and docs/agents/verification.md. Check GitHub mergeability and require a mergeable, non-dirty current head before PASS. Do not edit files, push, comment, label, approve, close, or merge. Determine whether the current head satisfies the issue with appropriate verification and no unrelated scope.

Score every rubric field from 0 to 2. PASS requires at least 8/10 and verificationEvidence above 0.

Return only JSON with this exact shape: {"verdict":"PASS|FAIL|BLOCKED","summary":"concise verdict or exact repair instruction","evidence":["command or runtime evidence"],"rubric":{"scopeControl":0,"acceptanceCriteria":0,"verificationEvidence":0,"harnessHygiene":0,"riskReporting":0}}.`;
}

function runRepair({ action, pr, state }) {
  const at = nowIso();
  beginRepair(state, { pr: pr.number, key: action.signal.key, head: pr.head, at });
  writeLoopState(STATE_PATH, state);
  let worktree;
  let runResult;
  let agentHead;
  let current = pr;
  try {
    worktree = prepareWorktree(pr.number, pr.head, 'repair', state.attemptsByPr[pr.number]);
    runResult = runCodex({
      role: 'repair',
      pr: pr.number,
      worktree,
      prompt: repairPrompt({ pr: pr.number, issue: action.issue, branch: pr.branch, head: pr.head, signal: action.signal }),
    });
    agentHead = git(['rev-parse', 'HEAD'], { cwd: worktree });
    current = pullContext(pr.number);
  } catch (error) {
    runResult = controllerFailureRun('repair', pr.number, error);
    try {
      current = pullContext(pr.number);
    } catch {
      current = pr;
    }
  } finally {
    removeWorktree(worktree);
  }
  const submitted = agentHead !== pr.head && current.head === agentHead;
  recordRun(runResult, {
    issue: action.issue,
    head: pr.head,
    sourceKey: action.signal.key,
    result: submitted ? 'submitted' : 'failed',
  });
  finishRepair(state, {
    key: action.signal.key,
    result: submitted ? 'submitted' : 'failed',
    headAfter: current.head,
    at: nowIso(),
  });
  writeLoopState(STATE_PATH, state);
  postComment(
    pr.number,
    `${runResult.runId}.md`,
    `## ECAS repair\n\n${submitted ? 'SUBMITTED' : 'STOPPED'}\n\n- Source: ${action.signal.sourceUrl}\n- Head before: \`${
      pr.head
    }\`\n- Head after: \`${current.head}\`\n- Attempt: ${state.attemptsByPr[pr.number]}/2\n- Trace: \`${basename(
      runResult.tracePath
    )}\`\n\n${runResult.message || 'No final agent message was produced.'}\n\n<!-- ecas-loop:v2 role=repair key=${
      action.signal.key
    } result=${submitted ? 'SUBMITTED' : 'STOPPED'} -->\n`
  );
  return submitted;
}

function runEvaluation({ action, pr, state }) {
  beginEvaluation(state, { pr: pr.number, head: pr.head, at: nowIso() });
  writeLoopState(STATE_PATH, state);
  let worktree;
  let runResult;
  let current = pr;
  try {
    worktree = prepareWorktree(pr.number, pr.head, 'evaluator', pr.head.slice(0, 12));
    runResult = runCodex({
      role: 'evaluator',
      pr: pr.number,
      worktree,
      prompt: evaluatorPrompt({ pr: pr.number, issue: action.issue, head: pr.head }),
      sandbox: 'read-only',
      outputSchema: EVALUATOR_SCHEMA_PATH,
    });
    current = pullContext(pr.number);
  } catch (error) {
    runResult = controllerFailureRun('evaluator', pr.number, error);
    try {
      current = pullContext(pr.number);
    } catch {
      current = pr;
    }
  } finally {
    removeWorktree(worktree);
  }
  let value;
  try {
    value = JSON.parse(runResult.message);
  } catch {
    value = null;
  }
  const evaluation = normalizeEvaluation({
    value,
    succeeded: runResult.succeeded,
    expectedHead: pr.head,
    currentHead: current.head,
    mergeable: current.mergeable,
    mergeStateStatus: current.mergeStateStatus,
  });
  recordRun(runResult, {
    issue: action.issue,
    head: pr.head,
    sourceKey: `evaluation:${pr.head}`,
    result: `evaluation-${evaluation.verdict.toLowerCase()}`,
  });
  finishEvaluation(state, { head: pr.head, verdict: evaluation.verdict, at: nowIso() });
  writeLoopState(STATE_PATH, state);
  const commentUrl = postComment(
    pr.number,
    `${runResult.runId}.md`,
    `## ECAS evaluator\n\n${evaluation.verdict}\n\n${evaluation.summary}\n\n### Evidence\n\n${
      evaluation.evidence.length ? evaluation.evidence.map((item) => `- ${item}`).join('\n') : '- No trusted evidence.'
    }\n\n### Rubric\n\n- Scope control: ${evaluation.rubric.scopeControl}/2\n- Acceptance criteria: ${
      evaluation.rubric.acceptanceCriteria
    }/2\n- Verification evidence: ${evaluation.rubric.verificationEvidence}/2\n- Harness hygiene: ${
      evaluation.rubric.harnessHygiene
    }/2\n- Risk reporting: ${evaluation.rubric.riskReporting}/2\n- Total: ${evaluation.total}/10\n\n- Evaluated head: \`${
      pr.head
    }\`\n- Trace: \`${basename(runResult.tracePath)}\`\n\n<!-- ecas-loop:v2 role=evaluator head=${pr.head} result=${
      evaluation.verdict
    } -->\n`
  );

  if (evaluation.stale) return;
  if (evaluation.verdict === 'PASS') {
    gh(['issue', 'edit', String(action.issue), '--repo', REPO, '--remove-label', 'in-progress', '--add-label', 'ready-for-human']);
    return;
  }
  if (evaluation.verdict === 'FAIL' && canRepair(state, pr.number)) {
    const signal = {
      kind: 'evaluator-failure',
      sourceId: runResult.runId,
      sourceUrl: commentUrl,
      head: pr.head,
      instruction: evaluation.summary,
      key: `evaluator-failure:${runResult.runId}:${pr.head}`,
    };
    let submitted = false;
    while (!submitted && canRepair(state, pr.number)) {
      submitted = runRepair({ action: { type: 'repair', issue: action.issue, signal }, pr, state });
    }
    if (!submitted) blockIssue(action.issue);
    return;
  }
  blockIssue(action.issue);
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

const inspect = () => loadDecision().action;

function main() {
  const { action, pr, state } = loadDecision();
  if (!pr || !state) return action;
  if (action.type === 'repair') runRepair({ action, pr, state });
  if (action.type === 'evaluate') runEvaluation({ action, pr, state });
  if (action.type === 'blocked') blockIssue(action.issue);
  return action;
}

if (process.argv.includes('--health')) {
  const result = health();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.status === 'healthy' ? 0 : 1);
}

if (process.argv.includes('--inspect')) {
  process.stdout.write(`${JSON.stringify(inspect(), null, 2)}\n`);
  process.exit(0);
}

if (!acquireLock()) process.exit(0);
try {
  writeFileSync(
    EVALUATOR_SCHEMA_PATH,
    `${JSON.stringify(
      {
        type: 'object',
        properties: {
          verdict: { type: 'string', enum: ['PASS', 'FAIL', 'BLOCKED'] },
          summary: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } },
          rubric: {
            type: 'object',
            properties: {
              scopeControl: { type: 'integer', minimum: 0, maximum: 2 },
              acceptanceCriteria: { type: 'integer', minimum: 0, maximum: 2 },
              verificationEvidence: { type: 'integer', minimum: 0, maximum: 2 },
              harnessHygiene: { type: 'integer', minimum: 0, maximum: 2 },
              riskReporting: { type: 'integer', minimum: 0, maximum: 2 },
            },
            required: ['scopeControl', 'acceptanceCriteria', 'verificationEvidence', 'harnessHygiene', 'riskReporting'],
            additionalProperties: false,
          },
        },
        required: ['verdict', 'summary', 'evidence', 'rubric'],
        additionalProperties: false,
      },
      null,
      2
    )}\n`,
    { mode: 0o600 }
  );
  writeHeartbeat('running');
  const action = main();
  writeHeartbeat('healthy', { lastAction: action.type, reason: action.reason });
  process.stdout.write(`${JSON.stringify(action, null, 2)}\n`);
} catch (error) {
  writeHeartbeat('failed', { error: error instanceof Error ? error.message : String(error) });
  throw error;
} finally {
  releaseLock();
}
