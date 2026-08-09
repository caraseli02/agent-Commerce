const CI_RUN_PATTERN = /\/actions\/runs\/(\d+)(?:\/|$)/;

function currentCiCheck(statusCheckRollup = []) {
  return statusCheckRollup.find((check) => check.__typename === 'CheckRun' && check.workflowName === 'CI' && check.name === 'verify');
}

export function ciAllowsEvaluation(statusCheckRollup = []) {
  const check = currentCiCheck(statusCheckRollup);
  return check?.status === 'COMPLETED' && check.conclusion === 'SUCCESS';
}

/** @param {{ pr?: any, processedRunIds?: Set<string> }} options */
export function findPendingCiSignal({ pr, processedRunIds = new Set() } = {}) {
  const check = currentCiCheck(pr?.statusCheckRollup);
  if (!check || check.status !== 'COMPLETED' || check.conclusion === 'SUCCESS') return null;

  const runId = String(check.detailsUrl ?? '').match(CI_RUN_PATTERN)?.[1];
  if (!runId || processedRunIds.has(runId) || !pr?.head) return null;

  return {
    kind: 'ci-failure',
    pr: pr.number,
    head: pr.head,
    runId,
    runUrl: check.detailsUrl,
    conclusion: check.conclusion,
    createdAt: check.completedAt,
  };
}
