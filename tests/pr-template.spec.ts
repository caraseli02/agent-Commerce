import { describe, expect, it } from 'vitest';

import {
  extractSection,
  hasEscapeHatch,
  inspectPrTemplate,
  isEvaluatorRubricComplete,
  isKnownRisksComplete,
  isRelatedLecturesComplete,
  isVerificationComplete,
} from '../scripts/verify-pr-template.mjs';

const compliantBody = `## Summary

Add PR template compliance gate.

## Related lectures

- Lecture 09 — Worker/checker separation
- Lecture 12 — Clean handoff

## Verification

- [x] \`pnpm verify\` — pass
- [x] Browser/runtime evidence — N/A (harness only)

## Known risks

- [x] None

## Evaluator rubric

- Scope control: 2/2
- Acceptance criteria: 2/2
- Verification evidence: 2/2
- Harness hygiene: 2/2
- Risk reporting: 2/2
`;

const minimalBody = `## Verification

- [ ] \`pnpm build\` — outcome:
- [ ] \`pnpm lint\` — outcome:

## Known risks

- [ ] None

## Evaluator rubric

- Scope control: /10
`;

describe('verify-pr-template', () => {
  it('extracts markdown sections by heading', () => {
    expect(extractSection(compliantBody, 'Verification')).toContain('pnpm verify');
    expect(extractSection(compliantBody, 'Missing section')).toBe('');
  });

  it('accepts a fully completed PR template body', () => {
    expect(inspectPrTemplate(compliantBody)).toEqual({ ok: true, skipped: false, violations: [] });
  });

  it('rejects minimal bodies that only repeat command names', () => {
    const result = inspectPrTemplate(minimalBody);

    expect(result.ok).toBe(false);
    expect(result.violations.join('\n')).toMatch(/Related lectures/);
    expect(result.violations.join('\n')).toMatch(/Verification section must include exact command outcomes/);
    expect(result.violations.join('\n')).toMatch(/Known risks/);
    expect(result.violations.join('\n')).toMatch(/Evaluator rubric must include numeric scores/);
  });

  it('validates section helpers independently', () => {
    expect(isRelatedLecturesComplete('- Lecture 10 — Full pipeline')).toBe(true);
    expect(isVerificationComplete('- [x] `pnpm test` — pass')).toBe(true);
    expect(isKnownRisksComplete('- [x] None')).toBe(true);
    expect(isEvaluatorRubricComplete('- Scope control: 2/2\n- Acceptance criteria: 2/2\n- Verification evidence: 2/2')).toBe(true);
  });

  it('supports documented escape hatches for human hotfixes', () => {
    expect(hasEscapeHatch('minimal body', { title: 'hotfix: restore checkout' })).toBe(true);
    expect(hasEscapeHatch('<!-- skip-pr-template -->', {})).toBe(true);
    expect(hasEscapeHatch('body', { labels: ['skip-pr-template'] })).toBe(true);
    expect(inspectPrTemplate(minimalBody, { title: 'hotfix: urgent rollback' }).skipped).toBe(true);
  });
});
