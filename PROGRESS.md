# ECAS Progress

## Current focus

- Harness verification is being simplified after the latest merged PR so normal loops do not run every handoff/runtime check by default.
- GitHub Issues remain the primary task queue.
- `PROGRESS.md` is the required current-state mirror for active issue/PR, blockers, and baseline status.
- The issue loop should follow planner → generator → evaluator separation: planner claims, generator ships PR, evaluator decides review readiness.
- The retry path now prefers a standing `/goal` controller over a separate mega-loop: evaluator failures stay on `in-progress` and feed back into the same goal.
- The completion trigger is event-driven: when Dev says the PR is ready, the controller immediately hands it to the evaluator instead of waiting for the next cron tick.

## In progress

- Harness cleanup — split the heavy verification gate into fast, full, and handoff commands; refresh stale harness docs.

## Recently completed

- Latest open PR was merged before this cleanup pass.
- Issue #73 — PR template with related lectures, evidence, risks, and evaluator rubric.
- Issue #69 — quality gate 1 baseline cleanup (`pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`).
- Issue #25 — ADR 0001 global 401 session redirect (`docs/adr/0001-global-401-session-redirect.md`).
- Issue #19 — gallery layout regression check (`tests/gallery-layout.spec.ts`).

## Blocked / known baseline failures

- None.

## Verification baseline

- `gh issue list --state open --label ready-for-agent`
- `gh label list --limit 50 | grep '^in-progress\b'`
- `./init.sh` — now completes the baseline checks successfully
- `pnpm verify` — fast default gate: build, lint, typecheck, test, feature-list validation
- `pnpm verify:full` — adds architecture invariants and preview smoke when needed
- `pnpm verify:handoff` — clean-tree handoff gate before PR/session completion

## Notes

- Use this file only for durable cross-session state, not transient task notes.
- Do not duplicate GitHub Issues here; mirror only the active issue/PR and baseline facts needed by the next session.
