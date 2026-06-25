# ECAS Progress

## Current focus

- HTTP migration epic #23 is in final cleanup.
- Current generator work is issue #42: remove the legacy `HttpFactory`/service-registry layer, delete orphan service files, simplify `plugins/api.ts` to `$apiClient`, and record final verification on branch `codex/42-final-http-cleanup`.
- GitHub Issues remain the primary task queue.
- `PROGRESS.md` is the required current-state mirror for active issue/PR, blockers, and baseline status.
- The issue loop should follow planner → generator → evaluator separation: planner claims, generator ships PR, evaluator decides review readiness.
- The retry path now prefers a standing `/goal` controller over a separate mega-loop: evaluator failures stay on `in-progress` and feed back into the same goal.
- The completion trigger is event-driven: when Dev says the PR is ready, the controller immediately hands it to the evaluator instead of waiting for the next cron tick.

## In progress

- Issue #42 — final HTTP migration cleanup after #55 merged. PR pending.

## Recently completed

- Issue #54 — control-panel API adapter part A and Shipping/Billing view migration; PR #214 merged.
- Issue #55 — remaining control-panel API calls migrated and `control-panel.service` deleted; PR #215 merged.
- Issue #53 — dashboard/control-panel orders calls migrated to `composables/api/orders`; prerequisite for #54 is closed.
- Issue #52 — orders checkout API adapter migration and checkout E2E failure coverage; PR #212 merged and issue closed before issue #53 pickup.
- Latest open PR was merged before this cleanup pass.
- Issue #73 — PR template with related lectures, evidence, risks, and evaluator rubric.
- Issue #69 — quality gate 1 baseline cleanup (`pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`).
- Issue #25 — ADR 0001 global 401 session redirect (`docs/adr/0001-global-401-session-redirect.md`).
- Issue #19 — gallery layout regression check (`tests/gallery-layout.spec.ts`).

## Blocked / known baseline failures

- No app-code baseline failures from this session.
- Local note: this worktree sits under a parent pnpm workspace, so direct `pnpm verify`/`pnpm verify:full` can trigger pnpm package-manager self-install loops. The equivalent gate commands passed when run with `pnpm --config.manage-package-manager-versions=false`.

## Verification baseline

- `gh issue list --state open --label ready-for-agent`
- `gh label list --limit 50 | grep '^in-progress\b'`
- `./init.sh` — now completes the baseline checks successfully
- `pnpm verify` — fast default gate: build, lint, typecheck, test, feature-list validation
- `pnpm verify:full` — adds architecture invariants and preview smoke when needed
- `pnpm verify:handoff` — clean-tree handoff gate before PR/session completion
- Issue #42 evidence: `tests/final-http-cleanup-boundary.spec.ts` failed before cleanup on `composables/HttpFactory.ts`, `composables/useFetchAPI.ts`, `services`, `components/dashboard/Header.vue`, and `plugins/api.ts`; it passes after migrating dashboard notifications to `composables/api/notifications`, deleting the legacy files, and simplifying `plugins/api.ts`. Required static `rg` invariants return zero matches; `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify` passes; `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify:full` passes, including architecture invariants and smoke for `/`, `/product-blocks`, and `/cart`. Runtime smoke evidence: Playwright product browse and checkout specs pass; targeted mock-token browser checks loaded `/dashboard/client?tab=orders` with Active Orders/Orders List and `/dashboard/orders` with the orders table.

## Notes

- Use this file only for durable cross-session state, not transient task notes.
- Do not duplicate GitHub Issues here; mirror only the active issue/PR and baseline facts needed by the next session.
