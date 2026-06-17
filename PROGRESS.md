# ECAS Progress

## Current focus

-   Baseline verification is green after the issue #69 cleanup.
-   Quality-gate work is prioritized before normal autonomous feature work resumes.
-   The issue loop should follow planner → generator → evaluator separation: planner claims, generator ships PR, evaluator decides review readiness.
-   The retry path now prefers a standing `/goal` controller over a separate mega-loop: evaluator failures stay on `in-progress` and feed back into the same goal.
-   The completion trigger is event-driven: when Dev says the PR is ready, the controller immediately hands it to the evaluator instead of waiting for the next cron tick.
-   Issue #73 is active in a fresh worktree: add the ECAS PR checklist/template.

## In progress

-   Issue #73 — PR template with related lectures, evidence, risks, and evaluator rubric.

## Recently completed

-   Issue #69 — quality gate 1 baseline cleanup (`pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`).
-   Issue #25 — ADR 0001 global 401 session redirect (`docs/adr/0001-global-401-session-redirect.md`).
-   Issue #19 — gallery layout regression check (`tests/gallery-layout.spec.ts`).

## Blocked / known baseline failures

-   None.

## Verification baseline

-   `gh issue list --state open --label ready-for-agent`
-   `gh label list --limit 50 | grep '^in-progress\b'`
-   `./init.sh` — now completes the baseline checks successfully
-   `pnpm build` — passes
-   `pnpm test` — passes
-   `pnpm lint` — passes
-   `pnpm typecheck` — passes

## Notes

-   Use this file only for durable cross-session state, not transient task notes.
