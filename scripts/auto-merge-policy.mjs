// Pure auto-merge policy for #603. No I/O: every input is plain data fetched by
// scripts/auto-merge.mjs, so each rule is unit-testable in isolation.

export const BASE_BRANCH = 'main';
export const CI_JOB_NAME = 'verify';
export const EVALUATOR_CONTEXT = 'evaluator/verdict';
export const ENABLED_VARIABLE = 'AUTO_MERGE_ENABLED';
export const AUTO_MERGE_TRAILER = 'Auto-merged-by';
export const AUTO_MERGE_TRAILER_VALUE = '.github/workflows/auto-merge.yml';
export const AUTO_MERGE_PR_TRAILER = 'Auto-merge-pr';

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const CI_FAILURE_CONCLUSIONS = new Set(['failure', 'timed_out', 'startup_failure']);

// Denylist wins over the allowlist. Matched case-insensitively so a path that
// collides with a protected one on a case-insensitive filesystem (macOS) still
// counts as protected.
const DENIED_FILES = new Set(['agents.md', 'claude.md', 'decisions.md', 'package.json', 'pnpm-lock.yaml']);
const DENIED_PREFIXES = ['docs/agents/', '.github/', '.husky/', 'scripts/'];

const ALLOWED_FILES = new Set(['README.md', 'skills-lock.json']);
const ALLOWED_PREFIXES = ['docs/', '.agents/skills/', '.claude/skills/'];

/** Returns null when the path is low-risk, otherwise the reason it is not. */
export function classifyPath(path) {
  if (typeof path !== 'string' || path.length === 0) {
    return 'empty path';
  }

  const lower = path.toLowerCase();

  if (DENIED_FILES.has(lower) || DENIED_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return `${path} is on the human-merge denylist`;
  }

  if (ALLOWED_FILES.has(path) || ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return null;
  }

  return `${path} is outside the low-risk allowlist`;
}

/**
 * Classifies a PR's changed-file list (GitHub "list pull request files" shape).
 * Renames and copies count by both the old and the new path. An empty or
 * truncated list is never low-risk.
 */
export function classifyChangedFiles(files, { expectedCount } = {}) {
  const reasons = [];

  if (!Array.isArray(files) || files.length === 0) {
    return { lowRisk: false, reasons: ['changed-file list is empty'] };
  }

  if (Number.isInteger(expectedCount) && files.length !== expectedCount) {
    reasons.push(`changed-file list is incomplete (${files.length} of ${expectedCount})`);
  }

  for (const file of files) {
    const paths = [file?.filename];

    if (file?.previous_filename) {
      paths.push(file.previous_filename);
    }

    for (const path of paths) {
      const reason = classifyPath(path);

      if (reason) {
        reasons.push(reason);
      }
    }
  }

  return { lowRisk: reasons.length === 0, reasons };
}

function newestFirst(items, dateKeys) {
  const time = (item) => {
    for (const key of dateKeys) {
      const value = Date.parse(item?.[key] ?? '');

      if (!Number.isNaN(value)) {
        return value;
      }
    }

    return 0;
  };

  return [...items].sort((a, b) => time(b) - time(a) || (b?.id ?? 0) - (a?.id ?? 0));
}

/** The latest CI workflow run for the head must be a completed success with a successful `verify` job. */
export function evaluateCi(runs, headSha) {
  const candidates = (Array.isArray(runs) ? runs : []).filter((run) => run?.head_sha === headSha);

  if (candidates.length === 0) {
    return `no CI run found for head ${headSha}`;
  }

  const [latest] = newestFirst(candidates, ['run_started_at', 'created_at']);

  if (latest.status !== 'completed' || latest.conclusion !== 'success') {
    return `CI run ${latest.id} is ${latest.status}/${latest.conclusion ?? 'none'}, not completed/success`;
  }

  const job = (Array.isArray(latest.jobs) ? latest.jobs : []).find((candidate) => candidate?.name === CI_JOB_NAME);

  if (!job) {
    return `CI run ${latest.id} has no '${CI_JOB_NAME}' job`;
  }

  if (job.status !== 'completed' || job.conclusion !== 'success') {
    return `CI job '${CI_JOB_NAME}' is ${job.status}/${job.conclusion ?? 'none'}, not completed/success`;
  }

  return null;
}

/**
 * `evaluator/verdict` may arrive as a commit status or a check run. Only
 * signals from the configured Evaluator App count. The newest trusted signal of
 * each kind must be success, and at least one must exist. Any other outcome,
 * including a future "did not run", blocks the merge.
 */
export function evaluateEvaluator({ statuses = [], checkRuns = [], headSha, evaluatorAppSlug }) {
  if (typeof evaluatorAppSlug !== 'string' || evaluatorAppSlug.trim() === '') {
    return 'Evaluator App slug is not configured (repo variable EVALUATOR_APP_SLUG)';
  }

  const slug = evaluatorAppSlug.trim().toLowerCase();
  const signals = [];

  const trustedStatuses = statuses.filter(
    (status) => status?.context === EVALUATOR_CONTEXT && status?.creator?.login?.toLowerCase() === `${slug}[bot]`,
  );

  if (trustedStatuses.length > 0) {
    const [latest] = newestFirst(trustedStatuses, ['updated_at', 'created_at']);

    signals.push({ kind: 'status', ok: latest.state === 'success', outcome: latest.state });
  }

  const trustedChecks = checkRuns.filter(
    (check) => check?.name === EVALUATOR_CONTEXT && check?.app?.slug?.toLowerCase() === slug && check?.head_sha === headSha,
  );

  if (trustedChecks.length > 0) {
    const [latest] = newestFirst(trustedChecks, ['completed_at', 'started_at']);

    signals.push({
      kind: 'check run',
      ok: latest.status === 'completed' && latest.conclusion === 'success',
      outcome: `${latest.status}/${latest.conclusion ?? 'none'}`,
    });
  }

  if (signals.length === 0) {
    return `no ${EVALUATOR_CONTEXT} from ${slug}[bot] on head ${headSha}`;
  }

  const failed = signals.find((signal) => !signal.ok);

  return failed ? `${EVALUATOR_CONTEXT} ${failed.kind} is ${failed.outcome}, not success` : null;
}

/**
 * The single merge decision. Returns `{ merge, sha, reasons }`; `merge` is true
 * only when no rule produced a reason. `sha` is the head the merge must be
 * pinned to.
 */
export function decideMerge({ enabled, eventSha, pr, files, ciRuns, statuses, checkRuns, evaluatorAppSlug }) {
  const reasons = [];
  const headSha = pr?.head?.sha;

  if (enabled !== 'true') {
    reasons.push(`${ENABLED_VARIABLE} is not exactly 'true'`);
  }

  if (!pr || typeof headSha !== 'string' || !SHA_PATTERN.test(headSha)) {
    return { merge: false, sha: null, reasons: [...reasons, 'pull request or head SHA is missing'] };
  }

  if (pr.state !== 'open') reasons.push(`PR is ${pr.state}, not open`);
  if (pr.draft) reasons.push('PR is a draft');
  if (pr.base?.ref !== BASE_BRANCH) reasons.push(`PR targets ${pr.base?.ref}, not ${BASE_BRANCH}`);
  if (pr.mergeable !== true) reasons.push(`PR mergeable is ${pr.mergeable}, not true`);

  if (eventSha !== undefined && eventSha !== null && eventSha !== headSha) {
    reasons.push(`event SHA ${eventSha} does not match current head ${headSha}`);
  }

  const classification = classifyChangedFiles(files, { expectedCount: pr.changed_files });

  reasons.push(...classification.reasons);

  const ciReason = evaluateCi(ciRuns, headSha);

  if (ciReason) reasons.push(ciReason);

  const evaluatorReason = evaluateEvaluator({ statuses, checkRuns, headSha, evaluatorAppSlug });

  if (evaluatorReason) reasons.push(evaluatorReason);

  return { merge: reasons.length === 0, sha: headSha, reasons };
}

/**
 * Maps a workflow trigger to the work it implies. Never reads PR head code;
 * only SHAs and PR numbers leave this function.
 */
export function planFromEvent(eventName, payload, { prNumber, ciWorkflowPath = '.github/workflows/ci.yml' } = {}) {
  if (eventName === 'workflow_dispatch') {
    const number = Number.parseInt(String(prNumber ?? ''), 10);

    return Number.isInteger(number) && number > 0
      ? { kind: 'evaluate', prNumbers: [number], sha: null }
      : { kind: 'skip', reason: 'workflow_dispatch needs a positive pr_number input' };
  }

  if (eventName === 'status') {
    if (payload?.context !== EVALUATOR_CONTEXT || payload?.state !== 'success') {
      return { kind: 'skip', reason: `status ${payload?.context}/${payload?.state} cannot trigger a merge` };
    }

    return { kind: 'evaluate', prNumbers: [], sha: payload.sha };
  }

  if (eventName === 'check_run') {
    const check = payload?.check_run;

    if (check?.name !== EVALUATOR_CONTEXT || check?.conclusion !== 'success') {
      return { kind: 'skip', reason: `check run ${check?.name}/${check?.conclusion} cannot trigger a merge` };
    }

    return {
      kind: 'evaluate',
      prNumbers: (check.pull_requests ?? []).map((pull) => pull.number),
      sha: check.head_sha,
    };
  }

  if (eventName === 'workflow_run') {
    const run = payload?.workflow_run;

    if (run?.path && run.path !== ciWorkflowPath) {
      return { kind: 'skip', reason: `workflow ${run.path} is not the CI workflow` };
    }

    if (run?.event === 'push' && run?.head_branch === BASE_BRANCH) {
      return CI_FAILURE_CONCLUSIONS.has(run.conclusion)
        ? { kind: 'pause-check', sha: run.head_sha, runUrl: run.html_url, conclusion: run.conclusion }
        : { kind: 'skip', reason: `CI on ${BASE_BRANCH} concluded ${run.conclusion}` };
    }

    if (run?.event === 'pull_request') {
      if (run.conclusion !== 'success') {
        return { kind: 'skip', reason: `PR CI concluded ${run.conclusion}` };
      }

      return {
        kind: 'evaluate',
        prNumbers: (run.pull_requests ?? []).map((pull) => pull.number),
        sha: run.head_sha,
      };
    }

    return { kind: 'skip', reason: `CI run for ${run?.event} on ${run?.head_branch} is not relevant` };
  }

  return { kind: 'skip', reason: `unsupported event ${eventName}` };
}

/** Merge commit title/message matching the repo's "Merge pull request" convention, plus identifying trailers. */
export function buildMergeCommit(pr) {
  const source = String(pr?.head?.label ?? pr?.head?.ref ?? '').replace(':', '/');

  return {
    commit_title: `Merge pull request #${pr.number} from ${source}`,
    commit_message: `${pr.title}\n\n${AUTO_MERGE_TRAILER}: ${AUTO_MERGE_TRAILER_VALUE}\n${AUTO_MERGE_PR_TRAILER}: #${pr.number}`,
  };
}

/** Returns `{ prNumber }` when a commit message carries the auto-merge trailer, otherwise null. */
export function parseAutoMergeCommit(message) {
  if (typeof message !== 'string') {
    return null;
  }

  const lines = message.split('\n').map((line) => line.trim());

  if (!lines.includes(`${AUTO_MERGE_TRAILER}: ${AUTO_MERGE_TRAILER_VALUE}`)) {
    return null;
  }

  const prLine = lines.find((line) => line.startsWith(`${AUTO_MERGE_PR_TRAILER}: #`));
  const prNumber = prLine ? Number.parseInt(prLine.slice(`${AUTO_MERGE_PR_TRAILER}: #`.length), 10) : Number.NaN;

  return { prNumber: Number.isInteger(prNumber) ? prNumber : null };
}
