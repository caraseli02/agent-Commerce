# Verification and evaluator rubric

Use this doc to decide whether an ECAS task is actually done. It implements the course recommendations for premature-victory prevention, full-pipeline verification, observability, and evaluator role separation.

## Verification ladder

Run the narrowest meaningful check first, then climb until the changed behavior is proven.

1. **Canonical full gate**
    - `pnpm verify`
    - This is the default answer to “Can this PR be considered verified?”
2. **Harness-state validator**
    - Run `./scripts/validate-feature-list.sh` whenever `feature_list.json` changes.
    - Use it to prove allowed statuses, WIP=1, and passing-item evidence stay mechanically correct.
3. **Targeted baseline check**
    - If you only need a smaller iteration, run `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` directly.
4. **Targeted test**
    - Add or update a focused Vitest test when behavior can be checked without the browser.
    - Prefer RED → GREEN → REFACTOR for bug fixes and behavior changes.
5. **Browser/runtime smoke**
    - Start `pnpm dev` or `pnpm preview` when UI/routes are affected and you need extra evidence beyond `pnpm verify`.
    - Exercise the affected page or server route.
    - Capture screenshot or exact route/flow evidence in the PR.
6. **Integration check**
    - If auth, checkout, cart, mock API, or state persistence changes, verify the full affected flow rather than only the touched component.

## Local gate ownership

- **Pre-commit:** `lint-staged` runs Prettier on staged files only.
- **Pre-push:** `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- **CI:** the same full gate as pre-push, with every command required to pass.

## If a local gate fails

1. Stop and fix the failing command before pushing.
2. If `lint-staged` rewrites files, restage those changes and rerun the hook.
3. If the failure is outside the current scope, record the exact command and output in `PROGRESS.md` and do not widen the task.

## Done gate

A task is not done until all are true:

-   Acceptance criteria from the issue are satisfied.
-   Relevant verification commands passed or a failure is explicitly explained as pre-existing/not applicable.
-   Browser/runtime evidence exists for UI or route changes.
-   No unrelated refactor was bundled into the task.
-   `feature_list.json` / `PROGRESS.md` are updated when durable state changed.
-   The PR body contains evidence, not just a confidence statement; for harness-state validator work, include the exact validator command output and at least one failure-mode example.
-   For harness-state validator work, make the PR body itself repeat the related lectures list, validation rules, command evidence, and a failure-mode example so the evaluator can review the evidence without hunting through the diff.
-   An evaluator other than the generator has reviewed the PR evidence and returned a passing verdict.

## Anti-premature-victory rules

-   Do not say “done” because code compiles.
-   Do not say “done” because unit tests pass if the feature crosses components.
-   Do not refactor while fixing unless the refactor is necessary for the acceptance criteria.
-   Do not broaden scope after a failing check; diagnose the failing signal first.
-   If verification cannot be run, report that as a blocker/risk instead of substituting opinion.

## Evaluator rubric

Use this for independent review before asking Vlad to review. The evaluator must not be the same run/agent that generated the implementation.

| Dimension             | 0                          | 1                          | 2                                          |
| --------------------- | -------------------------- | -------------------------- | ------------------------------------------ |
| Scope control         | unrelated changes included | mostly scoped, small drift | exactly one issue/behavior                 |
| Acceptance criteria   | unclear or unmet           | partially met              | all criteria demonstrably met              |
| Verification evidence | none                       | static checks only         | static + targeted/browser/runtime evidence |
| Harness hygiene       | state/docs stale           | some state updated         | progress/features/handoff clean            |
| Risk reporting        | risks hidden               | risks vague                | risks explicit with next action            |

Minimum score before PR is review-ready: **8/10**, with no zero in verification evidence.

## Agent-oriented failure messages

When adding tests or guardrails, write failures so a future agent knows how to fix them:

Bad:

```text
Auth failed
```

Good:

```text
Auth composable returned an unauthenticated state after login. Check that the mock login response updates the session token before redirecting to /dashboard.
```

A useful failure message says:

1. what went wrong
2. why it matters
3. where to look next

## Smoke gate

-   Run `pnpm smoke` against `pnpm dev` to verify the core routes load without crashing.
-   v1 smoke matrix: homepage (`/`) plus one representative product or gallery route selected from `pages/`.
-   Treat this as the minimal runtime check before broader auth/cart/checkout/dashboard verification.
