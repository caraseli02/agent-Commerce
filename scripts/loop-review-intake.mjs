const TRUSTED_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const QODO_BOTS = new Set(['qodo-code-review', 'qodo-code-review[bot]']);
const QODO_ACTION_PATTERN = /alt=["'](?:Action required|Remediation recommended)["']/i;
const QODO_REVIEW_PATTERN = /<h3>Code Review by Qodo<\/h3>/i;
const QODO_HEAD_PATTERN = /<!--\s*https:\/\/github\.com\/[^/]+\/[^/]+\/commit\/([a-f0-9]{40})\s*-->/i;
const POSITIVE_ONLY_PATTERN = /^(?:lgtm|looks good(?: to me)?|nice(?: work)?|thanks|approved)[.!]?$/i;

function asSourceId(value) {
  return value === undefined || value === null ? null : String(value);
}

function qodoSignal(comment, prHead) {
  if (!QODO_BOTS.has(comment.user?.login)) return null;

  const body = String(comment.body ?? '');
  if (!QODO_REVIEW_PATTERN.test(body) || !QODO_ACTION_PATTERN.test(body)) return null;

  const reviewedHead = body.match(QODO_HEAD_PATTERN)?.[1];
  if (reviewedHead !== prHead) return null;

  const sourceId = asSourceId(comment.id);
  if (!sourceId) return null;

  return {
    kind: 'qodo-review',
    sourceId,
    sourceUrl: comment.html_url,
    head: reviewedHead,
    createdAt: comment.created_at,
    author: comment.user.login,
  };
}

function latestReviewsByAuthor(reviews) {
  const latest = new Map();
  const ordered = [...reviews].sort((left, right) => new Date(left.submitted_at ?? 0) - new Date(right.submitted_at ?? 0));

  for (const review of ordered) {
    if (review.user?.login) latest.set(review.user.login, review);
  }
  return [...latest.values()];
}

function humanReviewSignal(review, prHead) {
  if (!TRUSTED_ASSOCIATIONS.has(review.author_association)) return null;
  if (review.commit_id !== prHead) return null;

  const body = String(review.body ?? '').trim();
  const isChangesRequested = review.state === 'CHANGES_REQUESTED';
  const isActionableComment = review.state === 'COMMENTED' && body.length > 0 && !POSITIVE_ONLY_PATTERN.test(body);
  if (!isChangesRequested && !isActionableComment) return null;

  const sourceId = asSourceId(review.id);
  if (!sourceId) return null;

  return {
    kind: isChangesRequested ? 'human-review' : 'human-review-comment',
    sourceId,
    sourceUrl: review.html_url,
    head: review.commit_id,
    createdAt: review.submitted_at,
    author: review.user?.login,
  };
}

function humanInlineCommentSignal(comment, prHead) {
  if (!TRUSTED_ASSOCIATIONS.has(comment.author_association)) return null;
  if (comment.commit_id !== prHead || comment.in_reply_to_id) return null;

  const body = String(comment.body ?? '').trim();
  if (!body || POSITIVE_ONLY_PATTERN.test(body)) return null;

  const sourceId = asSourceId(comment.id);
  if (!sourceId) return null;

  return {
    kind: 'human-inline-comment',
    sourceId,
    sourceUrl: comment.html_url,
    head: comment.commit_id,
    createdAt: comment.created_at,
    author: comment.user?.login,
  };
}

/**
 * @param {{ pr?: any, issueComments?: any[], reviewComments?: any[], reviews?: any[], processedSourceIds?: Set<string> }} options
 */
export function findPendingReviewSignal({
  pr,
  issueComments = [],
  reviewComments = [],
  reviews = [],
  processedSourceIds = new Set(),
} = {}) {
  const prHead = pr?.head?.sha;
  if (!prHead) return null;

  const signals = [
    ...issueComments.map((comment) => qodoSignal(comment, prHead)),
    ...reviewComments.map((comment) => humanInlineCommentSignal(comment, prHead)),
    ...latestReviewsByAuthor(reviews).map((review) => humanReviewSignal(review, prHead)),
  ]
    .filter(Boolean)
    .filter((signal) => !processedSourceIds.has(signal.sourceId))
    .sort((left, right) => new Date(left.createdAt ?? 0) - new Date(right.createdAt ?? 0));

  return signals[0] ?? null;
}
