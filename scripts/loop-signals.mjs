const CI_RUN_PATTERN = /\/actions\/runs\/(\d+)(?:\/|$)/;
const REPAIR_COMMAND_PATTERN = /^(?:\/repair|@codex\s+fix)\b\s*(.*)$/i;
const TRUSTED_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const QODO_BOTS = new Set(['qodo-code-review', 'qodo-code-review[bot]']);
const QODO_ACTION_PATTERN = /alt=["'](?:Action required|Remediation recommended)["']/i;
const QODO_REVIEW_PATTERN = /<h3>Code Review by Qodo<\/h3>/i;
const QODO_HEAD_PATTERN = /<!--\s*https:\/\/github\.com\/[^/]+\/[^/]+\/commit\/([a-f0-9]{40})\s*-->/i;
const POSITIVE_ONLY_PATTERN = /^(?:lgtm|looks good(?: to me)?|nice(?: work)?|thanks|approved)[.!]?$/i;

function signalKey(signal) {
  return `${signal.kind}:${signal.sourceId}:${signal.head}`;
}

export function ciPassed(checks = []) {
  const check = checks.find((candidate) => candidate.workflowName === 'CI' && candidate.name === 'verify');
  return check?.status === 'COMPLETED' && check.conclusion === 'SUCCESS';
}

/**
 * @param {{ pr?: any, issueComments?: any[], reviews?: any[], reviewComments?: any[], processedKeys?: Set<string> }} options
 */
export function selectRepairSignal({ pr, issueComments = [], reviews = [], reviewComments = [], processedKeys = new Set() } = {}) {
  const check = (pr?.checks ?? []).find((candidate) => candidate.workflowName === 'CI' && candidate.name === 'verify');
  if (!pr?.head) return null;
  const pending = (signal) => {
    const candidate = { ...signal, key: signalKey(signal) };
    return processedKeys.has(candidate.key) ? null : candidate;
  };

  if (check?.status === 'COMPLETED' && check.conclusion !== 'SUCCESS') {
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

  const seenReviewers = new Set();
  for (const review of [...reviews].reverse()) {
    const author = review.user?.login;
    if (!author || seenReviewers.has(author)) continue;
    seenReviewers.add(author);
    if (
      review.state !== 'CHANGES_REQUESTED' ||
      review.commit_id !== pr.head ||
      !TRUSTED_ASSOCIATIONS.has(review.author_association) ||
      !review.id
    ) {
      continue;
    }
    const signal = {
      kind: 'changes-requested',
      sourceId: String(review.id),
      sourceUrl: review.html_url,
      head: pr.head,
      createdAt: review.submitted_at,
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
    };
    const candidate = pending(signal);
    if (candidate) return candidate;
  }

  for (const comment of issueComments) {
    const body = String(comment.body ?? '').trim();
    if (QODO_BOTS.has(comment.user?.login)) {
      const reviewedHead = body.match(QODO_HEAD_PATTERN)?.[1];
      if (comment.id && reviewedHead === pr.head && QODO_REVIEW_PATTERN.test(body) && QODO_ACTION_PATTERN.test(body)) {
        const signal = {
          kind: 'qodo-review',
          sourceId: String(comment.id),
          sourceUrl: comment.html_url,
          head: pr.head,
          createdAt: comment.created_at,
        };
        const candidate = pending(signal);
        if (candidate) return candidate;
      }
      continue;
    }
    if (!TRUSTED_ASSOCIATIONS.has(comment.author_association)) continue;
    const match = body.match(REPAIR_COMMAND_PATTERN);
    if (!match || !comment.id) continue;
    const createdAt = Date.parse(comment.created_at ?? '');
    const committedAt = Date.parse(pr.headCommittedAt ?? '');
    if (!Number.isFinite(createdAt) || !Number.isFinite(committedAt) || createdAt < committedAt) continue;

    const signal = {
      kind: 'repair-command',
      sourceId: String(comment.id),
      sourceUrl: comment.html_url,
      head: pr.head,
      createdAt: comment.created_at,
      instruction: match[1].trim(),
    };
    const candidate = pending(signal);
    if (candidate) return candidate;
  }

  return null;
}
