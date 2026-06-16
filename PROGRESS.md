# ECAS Progress

## Current focus

-   Baseline verification is green after the issue #69 cleanup.

## In progress

-   None.

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
