/** @param {{ pr?: any, activeIssues?: any[] }} options */
export function findClaimedIssueForPr({ pr, activeIssues = [] } = {}) {
  if (activeIssues.length !== 1) return null;

  const activeIssue = activeIssues[0];
  const labelNames = new Set((activeIssue.labels ?? []).map((label) => label?.name));
  if (activeIssue.state !== 'OPEN' || !labelNames.has('in-progress')) return null;

  const linkedNumbers = new Set((pr?.closingIssuesReferences ?? []).map((issue) => issue?.number));
  return linkedNumbers.has(activeIssue.number) ? activeIssue : null;
}

export function failureMatchesCurrentHead(marker, prState) {
  return Boolean(marker?.head && prState?.headRefOid && marker.head === prState.headRefOid);
}
