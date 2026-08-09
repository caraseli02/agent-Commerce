#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const CLOSED_ISSUE_WORKFLOW_LABELS = ['blocked', 'in-progress', 'ready-for-agent'];

export function planClosedIssueLabelRepairs(issues = []) {
  const byNumber = new Map();

  for (const issue of issues) {
    if (issue?.state !== 'CLOSED' || !Number.isInteger(issue.number)) continue;

    const knownLabels = byNumber.get(issue.number) ?? new Set();
    for (const label of issue.labels ?? []) {
      if (CLOSED_ISSUE_WORKFLOW_LABELS.includes(label?.name)) knownLabels.add(label.name);
    }
    byNumber.set(issue.number, knownLabels);
  }

  return [...byNumber.entries()]
    .map(([number, labels]) => ({ number, removeLabels: [...labels].sort() }))
    .filter((repair) => repair.removeLabels.length > 0)
    .sort((left, right) => left.number - right.number);
}

function runGh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function repositoryFromArgs(args) {
  const repoIndex = args.indexOf('--repo');
  if (repoIndex >= 0 && args[repoIndex + 1]) return args[repoIndex + 1];
  if (process.env.ECAS_REPO) return process.env.ECAS_REPO;
  return runGh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).trim();
}

function loadClosedIssues(repo) {
  return CLOSED_ISSUE_WORKFLOW_LABELS.flatMap((label) =>
    JSON.parse(
      runGh(['issue', 'list', '--repo', repo, '--state', 'closed', '--label', label, '--limit', '100', '--json', 'number,state,labels'])
    )
  );
}

export function reconcileClosedIssueLabels({ repo, apply = false } = {}) {
  const repairs = planClosedIssueLabelRepairs(loadClosedIssues(repo));

  if (apply) {
    for (const repair of repairs) {
      runGh(['issue', 'edit', String(repair.number), '--repo', repo, '--remove-label', repair.removeLabels.join(',')]);
    }
  }

  return { repo, mode: apply ? 'apply' : 'dry-run', repaired: repairs.length, repairs };
}

function main() {
  const args = process.argv.slice(2);
  const result = reconcileClosedIssueLabels({
    repo: repositoryFromArgs(args),
    apply: args.includes('--apply'),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
