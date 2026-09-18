# Project Status

Last updated: 2026-09-18

## Current state

Components Marketplace remains a self-contained Nuxt e-commerce portfolio demo with a pragmatic modular-monolith architecture. The checkout/order hardening track has moved beyond the original local-persistence and authoritative-pricing gaps: durable PostgreSQL checkout state, canonical Orders reads, server-authoritative commercial snapshots, stale-review rejection, payment preparation, revision-aware Cart completion, and the major buyer-facing QA repairs are now merged.

System-design steps #6 and #7 remain the source of truth for ownership and dependency direction:

- [`docs/system-design/06-domain-boundaries-and-ownership.md`](system-design/06-domain-boundaries-and-ownership.md) defines authoritative ownership for Catalog, Cart, Inventory, Orders, Payments, Accounts, and application workflows.
- [`docs/system-design/07-public-module-contracts-and-dependency-graph.md`](system-design/07-public-module-contracts-and-dependency-graph.md) defines the modular-monolith dependency direction, public domain APIs, module firewall, and checkout/payment invariants.
- `tests/server-module-boundaries.spec.ts` protects the domain import boundary.

## Delivered checkout milestones

- PR #523 — PostgreSQL-only durable checkout persistence, cross-instance idempotency, reservations, Orders, and payment state.
- PR #526 — Orders-owned canonical reads and one server-authoritative checkout money policy.
- PR #529 — durable local Payment preparation before provider continuation; stable Order/reservation/Payment identities survive retry and recovery.
- PR #533 — paid checkout finalization commits before revision-aware best-effort Cart cleanup.
- PR #543 — stale cart/quote review identity is rejected before durable side effects.
- PRs #548, #549, and #550 — buyer-flow QA hardening across pricing, checkout recovery, credit, addresses, order history, tracking/privacy, draft isolation, stock races, payment reselection/result states, and protected-preview SSR.

The local checkout model now has strong retry/concurrency semantics. The remaining architectural gap is the external payment boundary: the repository still uses mock provider continuation and therefore does not yet prove provider-attempt idempotency, ambiguous timeout reconciliation, webhook/event deduplication, or provider-driven finalization recovery.

## Current planning controls

- GitHub Issues are the task queue.
- `PROGRESS.md` is the current session/progress mirror.
- `feature_list.json` is the machine-readable feature state and keeps WIP limited to one active feature.
- #536 is complete/passing.
- Epic #535 stays active until its still-open child issues are reconciled against the implementation merged through #550.

## Next work

1. Reconcile #535 child issues (#537-#547) against current `main`, closing only those whose acceptance criteria are evidenced and isolating any remaining defect.
2. Start issue #121 as the next system-design decision: choose the provider contract while preserving the existing Payments boundary and mock mode.
3. Define durable provider-attempt identity/idempotency and unknown-outcome reconciliation before real provider I/O.
4. Implement Stripe/provider adapter and webhook/event correlation without leaking provider SDK types across the Payments public API.
5. Add retry-safe payment finalization/recovery, then handle late success, payment retry, cancellation races, refunds, and automated recovery only as justified by explicit failure cases.

Nuxt source-layout migration, SEO, dependency upgrades, caching, and AI/agent features remain separate backlog tracks and should not displace the payment-lifecycle system-design sequence unless priorities intentionally change.
