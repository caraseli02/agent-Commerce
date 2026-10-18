import { assessReadiness, latestEvaluatorVerdict, protectedFilesTouched, isClaudeBuiltPr } from '../owner-attention.mjs';
import { assessEvidence } from './evidence.mjs';

// All live callers share this decision. Source review and CI remain separate:
// evaluators may inspect .checks before publishing their independent verdict.
export async function localReadiness({ github, pr, evidence, repository, policy, config, owner }) {
  const [comments, reviews, files, claude] = await Promise.all([
    github.list(`/issues/${pr.number}/comments`),
    github.list(`/pulls/${pr.number}/reviews`),
    github.list(`/pulls/${pr.number}/files`),
    isClaudeBuiltPr({ get: (p) => github.repo(p), paginate: (p) => github.list(p) }, pr),
  ]);
  const checks = assessEvidence(evidence, { repository, pr, policy });
  const verdict = latestEvaluatorVerdict(comments, pr.head.sha, { trustedLogins: [owner] });
  const result = assessReadiness({ pr, checks, verdict, reviews });
  const reasons = [...result.reasons];
  if (!['clean', 'unstable', 'has_hooks'].includes(pr.mergeable_state)) reasons.push('mergeability state is unknown or unacceptable');
  if (files.length >= 3000) reasons.push('protected-path diff may be truncated');
  const touched = protectedFilesTouched(files, config.protectedPaths);
  const approved = pr.labels.some((l) => l.name === 'owner-approved-harness');
  if (claude && touched.some((p) => p.group === 'payments' || !approved))
    reasons.push('Claude protected paths lack owner authorization or include excluded payments');
  const expected = claude ? 'Codex' : 'Claude';
  const marker = `<!-- evaluator-head: ${pr.head.sha} -->`;
  const legacy = `<!-- local-evaluator sha=${pr.head.sha} -->`;
  const reports = comments.filter(
    (c) =>
      c.user?.login === owner && [marker, legacy].some((m) => c.body?.trimStart().startsWith(m)) && c.body.includes('## Evaluator verdict'),
  );
  if (
    !reports.length ||
    reports.some(
      (c) => !new RegExp(`^[ \\t>]*(?:\\*{1,2})?Independent evaluator(?:\\*{1,2})?\\s*:(?:\\*{1,2})?\\s*${expected}\\b`, 'mi').test(c.body),
    )
  )
    reasons.push(`independent ${expected} evaluator attribution required`);
  return { ready: reasons.length === 0, reasons, checks, verdict, head: pr.head.sha };
}
