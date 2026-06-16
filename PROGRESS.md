# ECAS Progress

## Current focus

-   Quality-gate work is prioritized before normal autonomous feature work resumes.
-   The issue loop should follow planner → generator → evaluator separation: planner claims, generator ships PR, evaluator decides review readiness.

## In progress

-   None.

## Recently completed

-   Issue #25 — ADR 0001 global 401 session redirect (`docs/adr/0001-global-401-session-redirect.md`).
-   Issue #19 — gallery layout regression check (`tests/gallery-layout.spec.ts`).

## Blocked / known baseline failures

-   `pnpm lint` currently fails on pre-existing stylistic indentation errors across the codebase.
-   `pnpm typecheck` currently fails in `pages/signup.vue` because `$api` is not typed/resolved at lines 122 and 158.
-   These failures are baseline harness debt; do not hide them in PRs. Prefer a dedicated cleanup issue/PR instead of mixing with feature work.

## Verification baseline

-   `gh issue list --state open --label ready-for-agent`
-   `gh label list --limit 50 | grep '^in-progress\b'`
-   `./init.sh` — expected to stop on the known baseline failures above until they are fixed
-   `pnpm build` — currently passes
-   `pnpm test` — currently passes
-   `pnpm lint` — known baseline failure
-   `pnpm typecheck` — known baseline failure

## Notes

-   Use this file only for durable cross-session state, not transient task notes.
