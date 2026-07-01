# ECAS Progress

## Current focus

- Portfolio Demo MVP issue loop is active.
- Current generator work is issue #237: fix cart side-panel product thumbnails on branch `codex/237-cart-side-panel-thumbnails`.
- GitHub Issues remain the primary task queue.
- `PROGRESS.md` is the required current-state mirror for active issue/PR, blockers, and baseline status.
- The issue loop should follow planner → generator → evaluator separation: planner claims, generator ships PR, evaluator decides review readiness.
- The retry path now prefers a standing `/goal` controller over a separate mega-loop: evaluator failures stay on `in-progress` and feed back into the same goal.
- The completion trigger is event-driven: when Dev says the PR is ready, the controller immediately hands it to the evaluator instead of waiting for the next cron tick.

## In progress

- Issue #237 — cart side-panel line items now use defensive thumbnail extraction and stable shared fallback sizing. PR #264 open for evaluator review.

## Recently completed

- Issue #236 — product detail gallery and zoom media use the shared image fallback component with stable media sizing; PR #263 merged.
- Issue #235 — storefront product cards use the shared image fallback component with stable media sizing; PR #262 merged.
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
- Issue #237 evidence: `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm exec vitest run tests/cart-side-panel-thumbnail.spec.ts tests/product-detail-image-fallback.spec.ts` passes; browser smoke on `http://localhost:3001/product/prod-2` added a product, opened the cart side panel, and confirmed cart item thumbnails render with stable dimensions and no broken visible images; `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify` passes.

## Notes

- Use this file only for durable cross-session state, not transient task notes.
- Do not duplicate GitHub Issues here; mirror only the active issue/PR and baseline facts needed by the next session.
