# Components Marketplace Progress

## Current focus

- PR #478 — run bounded repair from this Mac via cron, with an isolated local Codex worktree and controller-owned credentials/publication.

## In progress

- The hosted `@codex fix` handoff has been replaced with a local exact-head worker. Focused controller/worker lifecycle tests pass; final verification and PR handoff remain.
- Cron activation waits until the controller is merged into the trusted checkout, a dedicated spend-limited API key exists in macOS Keychain, and observe-only selects the intended action.

## Current main baseline

- System design #6 and #7 are accepted. The first `PlaceOrder` vertical slice now routes the Nitro API through an application workflow and public module contracts.
- `tests/server-module-boundaries.spec.ts` enforces that API/application code cannot import module internals and one module cannot import another module's internals.
- Checkout contracts cover duplicate request IDs and cart revisions; duplicate/late payment success and cancellation during payment remain later architecture work.
- Preserve mock-mode behavior and the pragmatic modular monolith; do not expand this into a microservice or saga framework.

## Recently completed system-design work

- `docs/system-design/06-domain-boundaries-and-ownership.md` assigns Catalog, Cart, Inventory, Orders, Payments, Accounts, and application-workflow ownership, including transaction and recovery invariants.
- `docs/system-design/07-public-module-contracts-and-dependency-graph.md` defines public module firewalls, narrow immutable DTOs, idempotent transitions, and forbidden internal imports.
- Nuxt 4 migration is complete and verified in mock mode.
- Zod 4 remains deferred until the stable vee-validate adapter supports it.
- TanStack Table 9 remains a separate migration; the current Nuxt-compatible Table 8 / Virtual 3 stays in place.

## Verification baseline

- `./scripts/validate-feature-list.sh`
- `pnpm verify` — fast default gate
- `pnpm verify:full` — architecture invariants and preview smoke
- `pnpm verify:handoff` — clean-tree handoff gate

## Human decisions pending

- #316 (`ready-for-human`) — choose severity:low auto-merge versus evaluator policy.
- #121 (`ready-for-human`) — decide the production Stripe integration plan. The Payments boundary does not force the provider decision.

## Next checkpoint

- Finish PR #478 verification, update its description, and merge it before installing cron in `/Users/vladislavcaraseli/Documents/Ecas`.
