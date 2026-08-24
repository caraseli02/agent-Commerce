# Components Marketplace Progress

## Current focus

- No active migration ticket. Epic #457’s Nuxt 4 recovery sequence is merged through PR #502 at `14d6d763`.
- Next migration frontier: #468 (Zod 4); do not start it until its dependency/state wording is reconciled.
- GitHub Issues remain the primary task queue; WIP=1: issue #433 (Mock Integration Boundary for auth skip and payment UI) is active on branch `fix/issue-433`.
- PR #503 is tracking-only: it reconciles this durable state and changes no application behavior.

## In progress

- Issue #433 — Mock Integration Boundary for auth skip and payment UI. Centralized the demo auth-skip and payment-visibility decisions in `helpers/mock-integration.ts`; refactored `PaymentMethodSection.vue`, `pages/order-summary/index.vue`, and `middleware/auth.ts` to use the seam; added `tests/mock-integration.spec.ts`. Awaiting `pnpm verify` + mock checkout/auth smoke, then PR.

## Recently verified recovery

- PR #497 merged #467 at `0c930cab`; Pinia 4.0.3, `@pinia/nuxt` 1.0.2, persisted state 4.7.1, cart/session production checks, and `pnpm verify:full` passed.
- PR #500 merged at `34e2c8b8`; the final Tailwind 4 setup is Vite-only and CSS-first: `@tailwindcss/vite` processes the global `assets/css/main.css` source entrypoint into built CSS assets; that source owns the Tailwind imports, theme, and plugins.
- PR #501 merged at `f232ec6f`; search no-result rendering and narrow customer order history were recovered with focused production browser evidence.
- PR #502 merged at `14d6d763`; the local Chromium/macOS Playwright visual pilot and 18 reviewed baselines are documented in `docs/agents/verification.md`.

## Verification baseline

- `./scripts/validate-feature-list.sh`
- `pnpm verify` — fast default gate
- `pnpm verify:full` — architecture invariants and preview smoke
- `pnpm verify:handoff` — clean-tree handoff gate

## Human decisions pending

- #316 (`ready-for-human`) — choose severity:low auto-merge versus evaluator policy.
- #121 (`ready-for-human`) — decide the Stripe payment integration plan (HITL).

## Blocked / known baseline failures

- #468 is open and labeled `ready-for-agent`, but its body still says it is blocked by #461; it remains untouched in this reconciliation.
- PRs #501 and #502 passed their technical/application verification (including local `pnpm verify` and focused browser/visual checks); their overall GitHub `verify` jobs were red only because `check-pr-template.mjs` rejected PR metadata, not because those technical checks failed.
