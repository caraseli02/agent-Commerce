const SCORE_KEYS = ['scopeControl', 'acceptanceCriteria', 'verificationEvidence', 'harnessHygiene', 'riskReporting'];
const VERDICTS = new Set(['PASS', 'FAIL', 'BLOCKED']);

const fallbackRubric = () => Object.fromEntries(SCORE_KEYS.map((key) => [key, 0]));

function withReason(evaluation, verdict, reason) {
  return { ...evaluation, verdict, summary: `${evaluation.summary} ${reason}`.trim() };
}

/** @param {any} options */
export function normalizeEvaluation(options) {
  if (options.currentHead !== options.expectedHead) {
    return {
      verdict: 'STALE',
      summary: 'The PR head changed during evaluation; current-head CI and evaluation will run next.',
      evidence: [],
      rubric: fallbackRubric(),
      total: 0,
      stale: true,
    };
  }

  if (!options.succeeded) {
    return {
      verdict: 'BLOCKED',
      summary: 'The evaluator process failed; no verdict was trusted.',
      evidence: [],
      rubric: fallbackRubric(),
      total: 0,
      stale: false,
    };
  }

  const value = options.value;
  const scores = SCORE_KEYS.map((key) => Number(value?.rubric?.[key]));
  if (
    !value ||
    !VERDICTS.has(value.verdict) ||
    typeof value.summary !== 'string' ||
    !Array.isArray(value.evidence) ||
    scores.some((score) => !Number.isInteger(score) || score < 0 || score > 2)
  ) {
    return {
      verdict: 'BLOCKED',
      summary: 'The evaluator returned invalid structured output; no verdict was trusted.',
      evidence: [],
      rubric: fallbackRubric(),
      total: 0,
      stale: false,
    };
  }

  const rubric = Object.fromEntries(SCORE_KEYS.map((key, index) => [key, scores[index]]));
  const evaluation = {
    verdict: value.verdict,
    summary: value.summary.trim(),
    evidence: value.evidence.map(String),
    rubric,
    total: scores.reduce((sum, score) => sum + score, 0),
    stale: false,
  };
  if (evaluation.verdict !== 'PASS') return evaluation;
  if (options.mergeable === 'CONFLICTING' || options.mergeStateStatus === 'DIRTY') {
    return withReason(evaluation, 'FAIL', 'The current head has merge conflicts.');
  }
  if (options.mergeable !== 'MERGEABLE') {
    return withReason(evaluation, 'BLOCKED', 'GitHub did not confirm that the current head is mergeable.');
  }
  if (evaluation.total < 8 || rubric.verificationEvidence === 0 || evaluation.evidence.length === 0) {
    return withReason(evaluation, 'FAIL', 'PASS requires at least 8/10 and nonzero verification evidence.');
  }
  return evaluation;
}
