# Components Marketplace Progress

## Current focus

- Epic #457 — issue #473 upgrades `@nuxt/image` to 2.1.0; #472 remains blocked pending a dedicated TanStack Table 9 migration.
- Zod 4 issue #468 remains deferred: stable `@vee-validate/zod` 4.15.1 supports only Zod 3, so no peer override is permitted.

## In progress

- Issue #470 — upgraded to `apexcharts` 5.10.1 and `vue3-apexcharts` 1.11.1, resolving the adapter's ApexCharts 5.10+ peer requirement while preserving the 550 KB dashboard chart budget. Added focused authenticated browser smoke coverage for the customer-dashboard charts.

- Issue #472 — evaluated Table 9.1.2 and Virtual 3.13.36. Table 9 replaces `useVueTable`, `getState`, and the v8 row-model configuration with explicit feature registrations and feature-parameterized types across all shared/dashboard table components. Both scoped migration attempts were reverted; the current 8.21.3/3.13.18 pair remains verified on Nuxt 4.

- Issue #473 — `@nuxt/image` upgraded from 2.0.0 to 2.1.0. The remaining image, SVG, Swiper, shadcn, color-mode, viewport, fonts, and Leaflet modules were already at their current Nuxt 4-compatible releases. Focused image tests, typecheck, dashboard table browser smoke, and `pnpm verify` pass.

## Recently verified recovery

- PR #497 merged #467 at `0c930cab`; Pinia 4.0.3, `@pinia/nuxt` 1.0.2, persisted state 4.7.1, cart/session production checks, and `pnpm verify:full` passed.
- PR #500 merged at `34e2c8b8`; the final Tailwind 4 setup is Vite-only and CSS-first: `@tailwindcss/vite` processes the global `assets/css/main.css` source entrypoint into built CSS assets; that source owns the Tailwind imports, theme, and plugins.
- PR #501 merged at `f232ec6f`; search no-result rendering and narrow customer order history were recovered with focused production browser evidence.
- PR #502 merged at `14d6d763`; the local Chromium/macOS Playwright visual pilot and 18 reviewed baselines are documented in `docs/agents/verification.md`.
- PR #508 merged at `80fabbe6`; date-fns 4.4.0 is installed with reviewer date-helper and production browser verification.

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
