import { ciPassed, selectRepairSignal } from './loop-signals.mjs';
import { canRepair, hasEvaluation, processedKeys } from './loop-state.mjs';

function claimedIssue(pr, activeIssues) {
  if (activeIssues.length !== 1) return null;
  const issue = activeIssues[0];
  const labels = new Set((issue.labels ?? []).map((label) => label.name));
  if (String(issue.state).toUpperCase() !== 'OPEN' || !labels.has('in-progress') || !(pr.linkedIssues ?? []).includes(issue.number)) {
    return null;
  }
  return issue;
}

/**
 * @param {{ state: any, activeIssues?: any[], pr: any, issueComments?: any[], reviews?: any[], reviewComments?: any[] }} options
 */
export function decideNextAction({ state, activeIssues = [], pr, issueComments = [], reviews = [], reviewComments = [] }) {
  const issue = claimedIssue(pr, activeIssues);
  if (!issue) return { type: 'idle', reason: 'no-single-linked-work-item' };
  if (pr.trustedAuthor === false) return { type: 'idle', reason: 'untrusted-pr-author' };

  const signal = selectRepairSignal({
    pr,
    issueComments,
    reviews,
    reviewComments,
    processedKeys: processedKeys(state),
  });
  if (!signal && ciPassed(pr.checks) && !hasEvaluation(state, pr.head)) {
    if (pr.mergeable === 'UNKNOWN') return { type: 'idle', reason: 'mergeability-pending' };
    return { type: 'evaluate', pr: pr.number, issue: issue.number, head: pr.head };
  }
  if (!signal) return { type: 'idle', reason: 'no-pending-signal' };
  if (!canRepair(state, pr.number)) return { type: 'blocked', reason: 'repair-attempt-limit', pr: pr.number, issue: issue.number };
  return { type: 'repair', pr: pr.number, issue: issue.number, head: pr.head, signal };
}
