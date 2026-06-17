## Summary

<!-- What changed, in 1-3 bullets. Keep it scoped. -->

## Related lectures

-   Lecture 08 — Feature lists are harness primitives
-   Lecture 09 — Completion requires evidence, not confidence
-   Lecture 12 — Clean handoff requires accurate progress/state artifacts

## Validation rules

-   Allowed statuses only: `not_started`, `active`, `blocked`, `passing`.
-   WIP limit is 1: the count of `active` features must never exceed `policy.wip_limit`.
-   `active_feature_count` must match the real number of active features if it exists, or be removed as redundant.
-   Every `passing` feature must include a non-empty `evidence` array.

## Command evidence

-   `./scripts/validate-feature-list.sh`
-   Current-state output on `feature_list.json`: `feature_list.json OK: 9 feature(s), 0 active, 9 passing.`

## Failure mode example

-   A feature marked `passing` with an empty `evidence` array is rejected with a message that points to the specific feature and tells the agent to add evidence before claiming completion.
-   Two `active` features are rejected because the harness WIP limit is 1.

## Template evidence

-   [ ] This PR uses the ECAS PR template / checklist.
-   [ ] I filled out every required section, or explained why it does not apply.
-   [ ] The checklist is visible in the rendered PR body.

## Review flow

1. Vlad reviews the related lecture list above.
2. Vlad checks the validation rules and exact command evidence.
3. Vlad checks browser/runtime evidence when UI or routes changed.
4. Vlad checks the known-risks section and the evaluator rubric score.
5. Vlad decides whether the PR is review-ready or needs repair.

## Verification

-   [ ] `pnpm build` — outcome:
-   [ ] `pnpm lint` — outcome:
-   [ ] `pnpm typecheck` — outcome:
-   [ ] `pnpm test` — outcome:
-   [ ] Browser/runtime evidence, if applicable — route / screenshot / notes:

## Known risks

-   [ ] None
-   [ ] This PR changes harness/docs only
-   [ ] This PR changes UI/routes and needs runtime evidence
-   [ ] Other:

## Evaluator rubric

-   Scope control: /10
-   Acceptance criteria: /10
-   Verification evidence: /10
-   Harness hygiene: /10
-   Risk reporting: /10

Minimum expected score: 8/10 and no zero in verification evidence.

## Notes

-   This PR is a PR-process or harness change, not broad feature work.
-   If a checklist item does not apply, say why explicitly.
