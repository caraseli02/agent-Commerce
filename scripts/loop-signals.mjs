const CI_RUN_PATTERN = /\/actions\/runs\/(\d+)(?:\/|$)/;
// A repair command is deliberately bound to an exact head.  A comment has no
// immutable "observed head" field, so accepting an unqualified command would
// let it replay after a force-push or cherry-pick.
const REPAIR_COMMAND_PATTERN = /^\/repair\s+([a-f0-9]{40})\b\s+(.+?)\s*$/i;
export const TRUSTED_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const QODO_BOTS = new Set(['qodo-code-review', 'qodo-code-review[bot]']);
const QODO_ACTION_PATTERN = /alt=["'](?:Action required|Remediation recommended)["']/i;
const QODO_REVIEW_PATTERN = /<h3>Code Review by Qodo<\/h3>/i;
const QODO_HEAD_PATTERN = /<!--\s*https:\/\/github\.com\/[^/]+\/[^/]+\/commit\/([a-f0-9]{40})\s*-->/i;
const GREPTILE_BOTS = new Set(['greptile-apps', 'greptile-apps[bot]']);
const GREPTILE_ACTION_PATTERN = /Confidence Score:\s*[0-4]\/5|Files Needing Attention|Issue \d+/i;
const GREPTILE_HEAD_PATTERN = /Last reviewed commit:[\s\S]*?commit\/([a-f0-9]{40})/i;
const GREPTILE_PASS_PATTERN = /Confidence Score:\s*5\/5/i;
const POSITIVE_ONLY_PATTERN = /^(?:lgtm|looks good(?: to me)?|nice(?: work)?|thanks|approved)[.!]?$/i;
const ECAS_DISPATCH_PATTERN = /<!--\s*ecas-loop:v3\s+role=dispatcher\s+key=([^\s>]+)\s*-->\s*$/i;
const DISPATCH_MARKER_MAX_AGE_MS = 30 * 60 * 1000;

function signalKey(signal) {
  return `${signal.kind}:${signal.sourceId}:${signal.head}`;
}

export function ciPassed(checks = []) {
  const check = checks.find((candidate) => candidate.workflowName === 'CI' && candidate.name === 'verify');
  return check?.status === 'COMPLETED' && check.conclusion === 'SUCCESS';
}

/** @param {any[]} issueComments @param {string} controllerLogin */
export function controllerDispatchKeys(issueComments = [], controllerLogin = '', now = null) {
  const expectedLogin = controllerLogin.toLowerCase();
  if (!expectedLogin) return new Set();
  return new Set(
    issueComments.flatMap((comment) => {
      if (!TRUSTED_ASSOCIATIONS.has(comment.author_association) || String(comment.user?.login ?? '').toLowerCase() !== expectedLogin) {
        return [];
      }
      const createdAt = Date.parse(comment.created_at ?? '');
      if (Number.isFinite(now) && (!Number.isFinite(createdAt) || now - createdAt > DISPATCH_MARKER_MAX_AGE_MS)) return [];
      const key = String(comment.body ?? '').match(ECAS_DISPATCH_PATTERN)?.[1];
      return key ? [key] : [];
    }),
  );
}

/** @param {{ pr?: any, reviews?: any[], issueComments?: any[] }} options */
export function independentReviewPassed({ pr, reviews = [], issueComments = [] } = {}) {
  if (!pr?.head) return false;
  const reviewStateByAuthor = new Map();
  for (const review of reviews) {
    const author = review.user?.login;
    if (!author || review.commit_id !== pr.head || !TRUSTED_ASSOCIATIONS.has(review.author_association)) {
      continue;
    }
    // GitHub's COMMENTED review event does not clear a prior request for
    // changes. Only an approval or a dismissal resolves it.
    if (review.state === 'CHANGES_REQUESTED') reviewStateByAuthor.set(author, review.state);
    if (review.state === 'APPROVED' || review.state === 'DISMISSED') reviewStateByAuthor.set(author, review.state);
  }
  const states = [...reviewStateByAuthor.values()];
  if (states.includes('CHANGES_REQUESTED')) return false;
  if (states.includes('APPROVED')) return true;

  return [...issueComments].reverse().some((comment) => {
    const body = String(comment.body ?? '');
    return (
      GREPTILE_BOTS.has(comment.user?.login) &&
      body.match(GREPTILE_HEAD_PATTERN)?.[1] === pr.head &&
      GREPTILE_PASS_PATTERN.test(body) &&
      !GREPTILE_ACTION_PATTERN.test(body)
    );
  });
}

/**
 * @param {{ pr?: any, issueComments?: any[], reviews?: any[], reviewComments?: any[], processedKeys?: Set<string>, controllerLogin?: string, ignoreDeduplication?: boolean, now?: number }} options
 */
export function selectRepairSignal({
  pr,
  issueComments = [],
  reviews = [],
  reviewComments = [],
  processedKeys = new Set(),
  controllerLogin = '',
  ignoreDeduplication = false,
  now = Date.now(),
} = {}) {
  const check = (pr?.checks ?? []).find((candidate) => candidate.workflowName === 'CI' && candidate.name === 'verify');
  if (!pr?.head) return null;
  const dispatchedKeys = controllerDispatchKeys(issueComments, controllerLogin, now);
  const pending = (signal) => {
    const candidate = { ...signal, key: signalKey(signal) };
    return !ignoreDeduplication && (processedKeys.has(candidate.key) || dispatchedKeys.has(candidate.key)) ? null : candidate;
  };

  if (check?.status === 'COMPLETED' && check.conclusion === 'FAILURE') {
    const sourceId = String(check.detailsUrl ?? '').match(CI_RUN_PATTERN)?.[1];
    if (sourceId) {
      const signal = {
        kind: 'ci-failure',
        sourceId,
        sourceUrl: check.detailsUrl,
        head: pr.head,
        createdAt: check.completedAt,
      };
      const candidate = pending(signal);
      if (candidate) return candidate;
    }
  }

  const requestedChanges = new Map();
  for (const review of reviews) {
    const author = review.user?.login;
    if (!author || review.commit_id !== pr.head || !TRUSTED_ASSOCIATIONS.has(review.author_association)) continue;
    if (review.state === 'CHANGES_REQUESTED' && review.id) requestedChanges.set(author, review);
    if (review.state === 'APPROVED' || review.state === 'DISMISSED') requestedChanges.delete(author);
  }
  for (const review of requestedChanges.values()) {
    const signal = {
      kind: 'changes-requested',
      sourceId: String(review.id),
      sourceUrl: review.html_url,
      head: pr.head,
      createdAt: review.submitted_at,
      ...(String(review.body ?? '').trim() ? { instruction: String(review.body).trim() } : {}),
    };
    const candidate = pending(signal);
    if (candidate) return candidate;
  }

  for (const comment of reviewComments) {
    const body = String(comment.body ?? '').trim();
    if (
      !comment.id ||
      comment.in_reply_to_id ||
      comment.commit_id !== pr.head ||
      !TRUSTED_ASSOCIATIONS.has(comment.author_association) ||
      !body ||
      POSITIVE_ONLY_PATTERN.test(body)
    ) {
      continue;
    }
    const signal = {
      kind: 'inline-review',
      sourceId: String(comment.id),
      sourceUrl: comment.html_url,
      head: pr.head,
      createdAt: comment.created_at,
      instruction: body,
    };
    const candidate = pending(signal);
    if (candidate) return candidate;
  }

  for (const comment of issueComments) {
    const body = String(comment.body ?? '').trim();
    if (body.includes('<!-- ecas-loop:v3 ')) continue;
    if (QODO_BOTS.has(comment.user?.login)) {
      const reviewedHead = body.match(QODO_HEAD_PATTERN)?.[1];
      if (comment.id && reviewedHead === pr.head && QODO_REVIEW_PATTERN.test(body) && QODO_ACTION_PATTERN.test(body)) {
        const signal = {
          kind: 'qodo-review',
          sourceId: String(comment.id),
          sourceUrl: comment.html_url,
          head: pr.head,
          createdAt: comment.created_at,
          instruction: body,
        };
        const candidate = pending(signal);
        if (candidate) return candidate;
      }
      continue;
    }
    if (GREPTILE_BOTS.has(comment.user?.login)) {
      const reviewedHead = body.match(GREPTILE_HEAD_PATTERN)?.[1];
      if (comment.id && reviewedHead === pr.head && GREPTILE_ACTION_PATTERN.test(body)) {
        const signal = {
          kind: 'greptile-review',
          sourceId: String(comment.id),
          sourceUrl: comment.html_url,
          head: pr.head,
          createdAt: comment.created_at,
          instruction: body,
        };
        const candidate = pending(signal);
        if (candidate) return candidate;
      }
      continue;
    }
    if (!TRUSTED_ASSOCIATIONS.has(comment.author_association)) continue;
    const match = body.match(REPAIR_COMMAND_PATTERN);
    if (!match || !comment.id) continue;
    const commandHead = match[1].toLowerCase();
    const instruction = match[2].trim();
    if (commandHead !== String(pr.head).toLowerCase() || !instruction) continue;

    const signal = {
      kind: 'repair-command',
      sourceId: String(comment.id),
      sourceUrl: comment.html_url,
      head: pr.head,
      createdAt: comment.created_at,
      instruction,
    };
    const candidate = pending(signal);
    if (candidate) return candidate;
  }

  return null;
}
