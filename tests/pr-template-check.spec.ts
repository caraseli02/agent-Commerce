import { describe, expect, it } from 'vitest';
import { assessPrTemplate, resolvePullRequestContext } from '../scripts/check-pr-template.mjs';

type AssessPrTemplate = (args: { body?: string; labels?: string[] }) => {
  status: 'passed' | 'failed' | 'skipped';
  violations: string[];
};

const assess = assessPrTemplate as AssessPrTemplate;

const completeBody = `## Summary

- Tighten the PR template gate for generator PRs.

## Template evidence

- [x] This PR uses the Components Marketplace PR template / checklist.
- [x] I filled out every required section, or explained why it does not apply.
- [x] The checklist is visible in the rendered PR body.

## Review flow

1. Vlad checks verification outcomes and known risks.

## Verification

- [x] \`pnpm build\` — outcome: pass
- [x] \`pnpm lint\` — outcome: pass
- [x] \`pnpm typecheck\` — outcome: pass
- [x] \`pnpm test\` — outcome: pass
- [x] Browser/runtime evidence, if applicable — route / screenshot / notes: not applicable

## Known risks

- [x] None

## Evaluator rubric

- Scope control: /10
- Acceptance criteria: /10
- Verification evidence: /10
- Harness hygiene: /10
- Risk reporting: /10

## Notes

- This PR is a PR-process or harness change, not broad feature work.`;

const cursorBotBody = `## Summary

- Example Cursor bot body with shortened verification outcomes.

## Verification

- [x] \`pnpm build\` — pass (included in verify)
- [x] \`pnpm lint\` — pass
- [x] \`pnpm typecheck\` — pass
- [x] \`pnpm test\` — pass (168 tests)
- [x] Browser/runtime evidence — N/A

## Known risks

- [x] None

## Evaluator rubric

- Scope control: /10
- Acceptance criteria: /10
- Verification evidence: /10
- Harness hygiene: /10
- Risk reporting: /10`;

describe('PR template completeness gate', () => {
  it('uses current GitHub metadata instead of a stale workflow-event body', async () => {
    const staleEvent = {
      pull_request: {
        number: 502,
        body: '',
        labels: [],
      },
    };
    const fetchCurrentPullRequest = async () => ({
      number: 502,
      body: completeBody,
      labels: [],
    });

    const pullRequest = await resolvePullRequestContext(staleEvent, fetchCurrentPullRequest);

    expect(pullRequest.body).toBe(completeBody);
  });

  it('passes a fully filled generator PR body', () => {
    const result = assess({ body: completeBody });

    expect(result.status).toBe('passed');
    expect(result.violations).toEqual([]);
  });

  it('passes Cursor bot verification wording without requiring rubric scores', () => {
    const result = assess({ body: cursorBotBody });

    expect(result.status).toBe('passed');
    expect(result.violations).toEqual([]);
  });

  it('fails when verification outcomes are missing', () => {
    const result = assess({
      body: `## Verification

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
      ]),
    );
  });

  it('fails when checked verification commands have no outcome after the command', () => {
    const result = assess({
      body: `## Verification

- [x] \`pnpm build\`
- [x] \`pnpm lint\`
- [x] \`pnpm typecheck\`
- [x] \`pnpm test\`

## Known risks

- [x] None

## Evaluator rubric

- Scope control: /10
- Acceptance criteria: /10
- Verification evidence: /10
- Harness hygiene: /10
- Risk reporting: /10`,
    });

    expect(result.status).toBe('failed');
    expect(result.violations).toEqual(
      expect.arrayContaining(['Verification section is incomplete for: pnpm build, pnpm lint, pnpm typecheck, pnpm test.']),
    );
  });

  it('fails when evaluator rubric omits required field labels', () => {
    const result = assess({
      body: `## Verification

- [x] \`pnpm build\` — pass
- [x] \`pnpm lint\` — pass
- [x] \`pnpm typecheck\` — pass
- [x] \`pnpm test\` — pass

## Known risks

- [x] None

## Evaluator rubric

Looks good overall.`,
    });

    expect(result.status).toBe('failed');
    expect(result.violations).toEqual(
      expect.arrayContaining([
        'Evaluator rubric is missing fields for: Scope control, Acceptance criteria, Verification evidence, Harness hygiene, Risk reporting.',
      ]),
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
