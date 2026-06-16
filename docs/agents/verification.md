# Verification and evaluator rubric

Use this doc to decide whether an ECAS task is actually done. It implements the course recommendations for premature-victory prevention, full-pipeline verification, observability, and evaluator role separation.

## Verification ladder

Run the narrowest meaningful check first, then climb until the changed behavior is proven.

1. **Static/runtime baseline**
    - `pnpm build`
    - `pnpm lint`
    - `pnpm typecheck`
    - `pnpm test`
2. **Targeted test**
    - Add or update a focused Vitest test when behavior can be checked without the browser.
    - Prefer RED → GREEN → REFACTOR for bug fixes and behavior changes.
3. **Browser/runtime smoke**
    - Start `pnpm dev` when UI/routes are affected.
    - Exercise the affected page or server route.
    - Capture screenshot or exact route/flow evidence in the PR.
4. **Integration check**
    - If auth, checkout, cart, mock API, or state persistence changes, verify the full affected flow rather than only the touched component.

## Done gate

A task is not done until all are true:

-   Acceptance criteria from the issue are satisfied.
-   Relevant verification commands passed or a failure is explicitly explained as pre-existing/not applicable.
-   Browser/runtime evidence exists for UI or route changes.
-   No unrelated refactor was bundled into the task.
-   `feature_list.json` / `PROGRESS.md` are updated when durable state changed.
-   The PR body contains evidence, not just a confidence statement.
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
