# Project Status

Last updated: 2026-08-25

## Current state

Components Marketplace remains a self-contained Nuxt e-commerce portfolio demo. Recent merges hardened the Scripted Buyer Path (cart pricing, checkout states, storefront QA) and mobile dashboard tables. Open PRs cover session persistence, bundle splitting, and optimistic add-to-cart.

The Nuxt 4 migration is complete and verified in mock mode. The remaining modernization follow-ups are intentionally narrow: Zod 4 is deferred until its stable vee-validate adapter supports it, and TanStack Table 9 needs a dedicated shared-table contract migration. The current Nuxt 4-compatible Table 8 / Virtual 3 pair remains in place until that migration is separately scoped.

## Current planning controls

- [Feature Prioritization Audit](plans/2026-07-09-feature-prioritization-audit.md) defines the next small, reversible portfolio-demo cleanup slices.
- [Refactor Stabilization and Review Documentation PRD](prds/2026-07-09-refactor-stabilization-prd.md) records the broader stabilization scope, its verification seams, and its out-of-scope boundaries.
- GitHub Issues remain the task queue; `PROGRESS.md` mirrors the active issue/PR and baseline facts.

## Next work

Prioritize one independently verifiable cleanup from the removal backlog at a time. For the framework epic, keep the Zod 4 deferral and TanStack Table 9 migration separate from ordinary dependency maintenance.
