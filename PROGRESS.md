# Components Marketplace Progress

## Current focus

- Epic #457: **#459** Firebase/VueFire retirement is the only active issue; its planner brief is recorded and implementation starts after the #458 ledger cleanup lands.
- Buyer Flow as-built map: `docs/buyer-flow-architecture.md` (companion to `docs/buyer-flow-design-contract.md`).
- After that (also `priority:p2`): portfolio-scoped **Security #99** children and **SEO #103** children.
- GitHub Issues remain the primary task queue.

## In progress

- **#461** — PR #488 merged to `origin/main` at `1e80367d` with GitHub Actions and Vercel green. The human merge approved the documented Nuxt framework-package version assertion; the bundled CLI still reports `3.37.0` while the framework package is `4.5.2`.
- **#458** — PR #489 merged to `origin/main` at `170144c5` after GitHub Actions, Vercel, and direct Greptile review passed (5/5 confidence, no actionable findings). `pnpm deps:outdated` and `pnpm deps:audit` use `--ignore-workspace` to avoid parent-workspace resolution; no package upgrade or lockfile rewrite was made.
- **#459** — claimed with `in-progress` label and a planner brief. Scope is removal of Firebase and nuxt-vuefire while retaining the documented mock auth flows.

## Human decisions pending

- **#316** (`ready-for-human`) — choose severity:low auto-merge vs evaluator policy (options in issue comment).
- **#121** (`ready-for-human`) — Stripe payment integration plan (HITL).

## Architecture note (cross-runtime cart pricing)

- Shared pure helpers live in `helpers/cart-pricing.ts` (`resolveTierUnitPrice`, `clampCartQuantity`, `calculateCartLinePricing`).
- Client re-exports via `helpers/prices.helper.ts` (may toast / call `useCart`).
- Nitro mock cart imports `helpers/cart-pricing.ts` directly — do not import `prices.helper.ts` from `server/` (it pulls Vue composables and breaks Nitro).
- Order Money: `helpers/order-money.ts` (`calculateOrderMoney`); finish remaining callers via #426.
- Checkout post-order: `helpers/checkout-outcome.ts` (`resolveCheckoutOutcome`); `useOrder` applies outcomes — see #427.
- Security seam (planned): `server/utils/requireMockAuth` — see epic #99.
- SEO seam (planned): `usePageSeo` — see epic #103.

## Recently completed

- System-design triage (2026-08-06): closed `#101`; rewrote `#99`/`#103`; `wontfix` `#109`/`#111`/`#113`; promoted slim Security + SEO children.
- Housekeeping: closed zombie epics `#100`, `#102`, `#104`, `#255`, `#389`.
- Issue #194 / PR #440 — shared empty states on Scripted Buyer Path.
- Issue #404 / PR #439 — contract product `model/` trees to canonical `types/product` namespace.
- Issue #429 / PR #438 — browse/search application seam (`useProducts`).
- Issue #430 / PR #437 — cart update signals without event bus.
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
- `#433` is `ready-for-agent` but still prefer landing after `#427`.
- `#187`/`#188` prefer after `#186`; `#107` prefers `#108` util first.
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
- Open tracking epics (not pickup targets): `#99` Security (demo-scoped), `#103` SEO foundation.

## CI note (PR template gate)

- Cursor-bot PRs were failing `check-pr-template.mjs` on verification wording (`— pass` vs `— outcome: pass`) and blank evaluator rubric scores.
- Gate now requires Verification / Known risks / Evaluator rubric only (Related lectures removed). Rubric numeric scores are evaluator-owned; generators may leave `/10` placeholders.
