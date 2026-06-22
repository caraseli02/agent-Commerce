## Summary

<!-- What changed, in 1-3 bullets. Keep it scoped. -->

## Related lectures

- Lecture 09 — Worker/checker separation and no premature victory
- Lecture 10 — Full-pipeline verification evidence
- Lecture 11 — Process observability, sprint contracts, evaluator rubric
- Lecture 12 — Clean handoff and known-risk reporting
- Resource templates — session handoff and evaluator rubric

## Template evidence

- [ ] This PR uses the ECAS PR template / checklist.
- [ ] I filled out every required section, or explained why it does not apply.
- [ ] The checklist is visible in the rendered PR body.

## Review flow

1. Vlad reviews the related lecture list above.
2. Vlad checks the PR body for exact verification commands and outcomes.
3. Vlad checks browser/runtime evidence when UI or routes changed.
4. Vlad checks the known-risks section and the evaluator rubric score.
5. Vlad decides whether the PR is review-ready or needs repair.

## Verification

- [ ] `pnpm build` — outcome:
- [ ] `pnpm lint` — outcome:
- [ ] `pnpm typecheck` — outcome:
- [ ] `pnpm test` — outcome:
- [ ] Browser/runtime evidence, if applicable — route / screenshot / notes:

## Known risks

- [ ] None
- [ ] This PR changes harness/docs only
- [ ] This PR changes UI/routes and needs runtime evidence
- [ ] Other:

## Evaluator rubric

- Scope control: /10
- Acceptance criteria: /10
- Verification evidence: /10
- Harness hygiene: /10
- Risk reporting: /10

Minimum expected score: 8/10 and no zero in verification evidence.

## Notes

- This PR is a PR-process or harness change, not broad feature work.
- If a checklist item does not apply, say why explicitly.
