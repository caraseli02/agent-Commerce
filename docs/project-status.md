# Project Status

Last updated: 2026-08-13

## Current state

Components Marketplace remains a self-contained Nuxt e-commerce portfolio demo. Recent merges hardened the Scripted Buyer Path (cart pricing, checkout states, storefront QA) and mobile dashboard tables. Open PRs cover session persistence, bundle splitting, and optimistic add-to-cart.

The Nuxt 4 upgrade is currently blocked on a legacy cross-surface type-check backlog. The migration branch builds successfully and its bundle-size guard supports Nuxt 4's generated manifest layout, but `pnpm typecheck` must pass before the upgrade can be review-ready. Keep its repair scope limited to migration-caused typing compatibility; core-flow behavior remains with the downstream verification issue.

## Current planning controls

- [Feature Prioritization Audit](plans/2026-07-09-feature-prioritization-audit.md) defines the next small, reversible portfolio-demo cleanup slices.
- [Refactor Stabilization and Review Documentation PRD](prds/2026-07-09-refactor-stabilization-prd.md) records the broader stabilization scope, its verification seams, and its out-of-scope boundaries.
- GitHub Issues remain the task queue; `PROGRESS.md` mirrors the active issue/PR and baseline facts.

## Next work

Prioritize one independently verifiable cleanup from the removal backlog at a time. Keep harness-skill changes separate from runtime app behavior in future pull requests whenever practical.
