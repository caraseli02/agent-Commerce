# Components Marketplace Progress

## Current focus

- Nuxt 4 revalidation is complete: project references are adopted, global type relaxations are removed, and E457-465 passes strict typecheck plus full verification without a global suppression.
- Epic #457 — #473 is complete on `codex/473-nuxt-ui-modules`; #472 remains blocked pending a dedicated TanStack Table 9 migration.
- Zod 4 issue #468 remains deferred: stable `@vee-validate/zod` 4.15.1 supports only Zod 3, so no peer override is permitted.

## In progress

- None.

## Recently verified recovery

- PR #497 merged #467 at `0c930cab`; Pinia 4.0.3, `@pinia/nuxt` 1.0.2, persisted state 4.7.1, cart/session production checks, and `pnpm verify:full` passed.
- PR #500 merged at `34e2c8b8`; the final Tailwind 4 setup is Vite-only and CSS-first: `@tailwindcss/vite` processes the global `assets/css/main.css` source entrypoint into built CSS assets; that source owns the Tailwind imports, theme, and plugins.
- PR #501 merged at `f232ec6f`; search no-result rendering and narrow customer order history were recovered with focused production browser evidence.
- PR #502 merged at `14d6d763`; the local Chromium/macOS Playwright visual pilot and 18 reviewed baselines are documented in `docs/agents/verification.md`.
- PR #508 merged at `80fabbe6`; date-fns 4.4.0 is installed with reviewer date-helper and production browser verification.
- Issue #473 — `@nuxt/image` upgraded from 2.0.0 to 2.1.0. The remaining image, SVG, Swiper, shadcn, color-mode, viewport, fonts, and Leaflet modules were already at their current Nuxt 4-compatible releases. Focused image tests, the direct product-detail browser route, typecheck, and `pnpm verify` pass.

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
- None for the #470 chart migration. The previous customer-profile/customer-home `GlobalEmptyState` and `runtimeConfig.toJSON` warnings were resolved by explicit empty-state imports; the full dashboard console smoke now passes.
