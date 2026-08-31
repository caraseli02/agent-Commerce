import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { decideNextAction } from './loop-policy.mjs';
import { beginDispatch, finishDispatch, readLoopState, writeLoopState } from './loop-state.mjs';

function decide(snapshot, state, now) {
  if (!snapshot?.pr) return { type: 'idle', reason: snapshot?.reason ?? 'no-linked-open-pr' };
  return decideNextAction({
    state,
    activeIssues: snapshot.activeIssues,
    pr: snapshot.pr,
    issueComments: snapshot.issueComments,
    reviews: snapshot.reviews,
    reviewComments: snapshot.reviewComments,
    now,
  });
}

function sameAction(expected, current) {
  return (
    expected.type === current.type &&
    expected.pr === current.pr &&
    expected.issue === current.issue &&
    expected.head === current.head &&
    (expected.signal?.key ?? null) === (current.signal?.key ?? null) &&
    String(expected.signal?.instruction ?? '').trim() === String(current.signal?.instruction ?? '').trim()
  );
}

function appendRunSummary(path, summary) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(summary)}\n`, { mode: 0o600 });
}

/** Run one WIP=1 reconciliation. The worker repairs locally; the GitHub
 * adapter owns trusted publication and issue mutations. */
export async function runControllerCycle({
  github,
  worker,
  statePath,
  summaryPath,
  observeOnly = false,
  now = () => new Date().toISOString(),
  nowMs = Date.now,
}) {
  const state = readLoopState(statePath);
  const observedNow = nowMs();
  const initial = github.loadSnapshot();
  const action = decide(initial, state, observedNow);
  if (action.type === 'idle') return action;
  if (observeOnly) return { ...action, observeOnly: true };

  const refreshed = github.refreshSnapshot(action.pr);
  const currentAction = decide(refreshed, state, observedNow);
  if (!sameAction(action, currentAction)) return { type: 'idle', reason: 'decision-changed-before-mutation' };

  if (action.type === 'dispatch') {
    const startedAt = now();
    const decisionState = structuredClone(state);
    beginDispatch(state, { pr: action.pr, key: action.signal.key, head: action.head, at: startedAt });
    writeLoopState(statePath, state);
    let result = 'failed';
    let publishedHead = null;
    try {
      const evidence = github.repairEvidence(action.signal);
      const finalSnapshot = github.refreshSnapshot(action.pr);
      const finalAction = decide(finalSnapshot, decisionState, nowMs());
      if (!sameAction(action, finalAction)) return { type: 'idle', reason: 'decision-changed-before-repair' };
      ({ publishedHead } = await worker.repair({ action, pr: finalSnapshot.pr, evidence }));
      result = 'published';
      return { ...action, repaired: true, publishedHead };
    } finally {
      const completedAt = now();
      finishDispatch(state, { key: action.signal.key, result, publishedHead, at: completedAt });
      writeLoopState(statePath, state);
      appendRunSummary(summaryPath, {
        version: 3,
        role: 'local-repair',
        pr: action.pr,
        issue: action.issue,
        head: action.head,
        sourceKey: action.signal.key,
        startedAt,
        completedAt,
        result,
        publishedHead,
      });
    }
  }

  if (action.type === 'blocked') {
    github.blockIssue(action);
    return { ...action, blocked: true };
  }
  if (action.type === 'ready') {
    github.promoteIssue(action);
    return { ...action, promoted: true };
  }
  return action;
}
