import { ciPassed, independentReviewPassed, selectRepairSignal } from './loop-signals.mjs';
import { canRepair, hasInFlightDispatch, processedKeys } from './loop-state.mjs';

function dispatchedHeads(state, pr) {
  const stateHeads = Object.values(state.dispatches ?? {})
    .filter((record) => record?.pr === pr && ['published', 'dispatched'].includes(record?.result))
    .map((record) => record.head);
  return new Set(stateHeads);
}

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
 * @param {{ state: any, activeIssues?: any[], pr: any, issueComments?: any[], reviews?: any[], reviewComments?: any[], controllerLogin?: string, now?: number }} options
 */
export function decideNextAction({
  state,
  activeIssues = [],
  pr,
  issueComments = [],
  reviews = [],
  reviewComments = [],
  controllerLogin = '',
  now = Date.now(),
}) {
  const issue = claimedIssue(pr, activeIssues);
  if (!issue) return { type: 'idle', reason: 'no-single-linked-work-item' };
  if (pr.targetSafe !== true) return { type: 'idle', reason: 'unsafe-pr-target' };
  if (pr.trustedAuthor !== true) return { type: 'idle', reason: 'untrusted-pr-author' };
  // Repairs need only a non-conflicting head: GitHub reports failed/pending
  // checks as UNSTABLE/BLOCKED. Promotion is deliberately stricter below.
  if (pr.mergeable === 'CONFLICTING' || pr.mergeStateStatus === 'DIRTY') return { type: 'idle', reason: 'awaiting-non-conflicting-pr' };
  if (hasInFlightDispatch(state, pr.number, pr.head, now)) return { type: 'idle', reason: 'awaiting-hosted-repair' };
  const signal = selectRepairSignal({
    pr,
    issueComments,
    reviews,
    reviewComments,
    processedKeys: processedKeys(state, now),
    controllerLogin,
    now,
  });
  if (!signal && ciPassed(pr.checks)) {
    if (dispatchedHeads(state, pr.number).has(pr.head)) {
      return { type: 'idle', reason: 'awaiting-updated-head' };
    }
    if (pr.mergeable !== 'MERGEABLE' || pr.mergeStateStatus !== 'CLEAN') return { type: 'idle', reason: 'awaiting-mergeable-clean-pr' };
    if (independentReviewPassed({ pr, reviews, issueComments })) {
      return { type: 'ready', pr: pr.number, issue: issue.number, head: pr.head };
    }
    return { type: 'idle', reason: 'awaiting-independent-review' };
  }
  if (!signal) return { type: 'idle', reason: 'no-pending-signal' };
  if (!canRepair(state, pr.number)) {
    return {
      type: 'blocked',
      reason: 'repair-attempt-limit',
      pr: pr.number,
      issue: issue.number,
      head: pr.head,
      attempts: Number(state.attemptsByPr?.[pr.number] ?? 0),
      signal,
    };
  }
  return { type: 'dispatch', pr: pr.number, issue: issue.number, head: pr.head, signal };
}
