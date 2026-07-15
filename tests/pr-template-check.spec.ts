import { describe, expect, it } from 'vitest';
import { assessPrTemplate } from '../scripts/check-pr-template.mjs';

type AssessPrTemplate = (args: { body?: string; labels?: string[] }) => {
  status: 'passed' | 'failed' | 'skipped';
  violations: string[];
};

const assess = assessPrTemplate as AssessPrTemplate;

const completeBody = `## Summary

- Tighten the PR template gate for generator PRs.

## Related lectures

- Lecture 09 — Worker/checker separation and no premature victory
- Lecture 10 — Full-pipeline verification evidence
- Lecture 11 — Process observability, sprint contracts, evaluator rubric

## Template evidence

- [x] This PR uses the ECAS PR template / checklist.
- [x] I filled out every required section, or explained why it does not apply.
- [x] The checklist is visible in the rendered PR body.

## Review flow

1. Vlad reviews the related lecture list above.

## Verification

- [x] \`pnpm build\` — outcome: pass
- [x] \`pnpm lint\` — outcome: pass
- [x] \`pnpm typecheck\` — outcome: pass
- [x] \`pnpm test\` — outcome: pass
- [x] Browser/runtime evidence, if applicable — route / screenshot / notes: not applicable

## Known risks

- [x] None

## Evaluator rubric

- Scope control: 8/10
- Acceptance criteria: 9/10
- Verification evidence: 10/10
- Harness hygiene: 9/10
- Risk reporting: 8/10

## Notes

- This PR is a PR-process or harness change, not broad feature work.`;

describe('PR template completeness gate', () => {
  it('passes a fully filled generator PR body', () => {
    const result = assess({ body: completeBody });

    expect(result.status).toBe('passed');
    expect(result.violations).toEqual([]);
  });

  it('fails when verification outcomes and rubric scores are missing', () => {
    const result = assess({
      body: `## Related lectures

- Lecture 09 — Worker/checker separation and no premature victory

## Verification

- [ ] \`pnpm build\`
- [ ] \`pnpm lint\`

## Known risks

- [ ] None

## Evaluator rubric

- Scope control: /10
- Acceptance criteria: /10
- Verification evidence: /10
- Harness hygiene: /10
- Risk reporting: /10`,
    });

    expect(result.status).toBe('failed');
    expect(result.violations).toEqual(
      expect.arrayContaining([
        'Verification section is incomplete for: pnpm build, pnpm lint, pnpm typecheck, pnpm test.',
        'Known risks section must check at least one option or explicitly say none.',
        'Evaluator rubric is missing scores for: Scope control, Acceptance criteria, Verification evidence, Harness hygiene, Risk reporting.',
      ])
    );
  });

  it('skips when the documented bypass label is present', () => {
    const result = assess({
      body: '## Verification\n\n- [ ] `pnpm build`',
      labels: ['human-hotfix'],
    });

    expect(result.status).toBe('skipped');
    expect(result.violations).toEqual([]);
  });
});
