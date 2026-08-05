# ECAS Progress

## Current focus

- Issue #429 / PR #438 — browse/search application seam (`useProducts`); evaluator PASS after Qodo repair + rebase onto main.
- GitHub Issues remain the primary task queue.

## In progress

- PR #438 on branch `feat/429-browse-search-application-seam`; awaiting human review/merge after conflict rebase.

## Architecture note (cross-runtime cart pricing)

- Shared pure helpers live in `helpers/cart-pricing.ts` (`resolveTierUnitPrice`, `clampCartQuantity`, `calculateCartLinePricing`).
- Client re-exports via `helpers/prices.helper.ts` (may toast / call `useCart`).
- Nitro mock cart imports `helpers/cart-pricing.ts` directly — do not import `prices.helper.ts` from `server/` (it pulls Vue composables and breaks Nitro).

## Recently completed

- Issue #425 / PR #434 — Order Money module on Scripted Buyer Path.
- Issue #402 / PR #424 — retire FormInput on Scripted Buyer Path.
- Issue #403 / PR #423 — order and dashboard type namespace consolidation.
- Issue #399 / PR #417 — reduce Swiper weight on home merchandising surfaces.
- Issue #390 / PR #405 — CLAUDE.md API guidance synced with live `composables/api` architecture.
- Issue #385 / PR #386 — optimistic add-to-cart on Scripted Buyer Path.
- Issue #349 / PR #383 — dashboard bundle split and bundle-size guardrails.
- Issue #348 / PR #382 — persist reviewer cart sessions across server restarts.
- Issue #301 / PR #387 — refactor stabilization PRD completed with timeline.
- Issue #368 / PR #364 — storefront hardening merged to `main`.

## Blocked / known baseline failures

- No app-code baseline failures.
- Local note: this repo can sit under a parent pnpm workspace; use `pnpm --config.manage-package-manager-versions=false` if package-manager self-install loops appear.

## Verification baseline

- `gh issue list --state open --label ready-for-agent`
- `gh label list --limit 50 | grep '^in-progress\b'`
- `./init.sh`
- `pnpm verify` — fast default gate
- `pnpm verify:full` — architecture invariants and preview smoke
- `pnpm verify:handoff` — clean-tree handoff gate

## Notes

- Use this file only for durable cross-session state, not transient task notes.
- Do not duplicate GitHub Issues here; mirror only the active issue/PR and baseline facts needed by the next session.

## CI note (PR template gate)

- Cursor-bot PRs were failing `check-pr-template.mjs` on verification wording (`— pass` vs `— outcome: pass`) and blank evaluator rubric scores.
- Gate now requires Verification / Known risks / Evaluator rubric only (Related lectures removed). Rubric numeric scores are evaluator-owned; generators may leave `/10` placeholders.
