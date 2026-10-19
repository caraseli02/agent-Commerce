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
- GitHub issue labels, assignments and linked PRs are the only live task state and enforce per-builder WIP=1.
- `PROGRESS.md` is a historical session note; ordinary feature PRs leave it unchanged.
- `feature_list.json` archives historical validation/evidence without task statuses, active counts or claims.
- #536 and epic #535 are complete/passing. The reconciliation closed #537-#542 and #544-#547 after current-main coverage and preview-browser checks; #543 had already merged and closed.

The recorded reconciliation evidence is: stable product/cart/refreshed checkout pricing (#537); 150/151 and last-stock safeguards (#538); cart-change recovery (#539/#543); restored checkout drafts (#540); credit shortfall explanation (#541); unsigned tracking protection (#542); linked Paid transaction history (#544); exact and no-match order search (#545); saved checkout addresses (#546); and cart/draft identity isolation (#547). No residual #535 defect was reproduced.

## Next work

1. Start issue #121 as the next system-design decision: choose the provider contract while preserving the existing Payments boundary and mock mode.
2. Define durable provider-attempt identity/idempotency and unknown-outcome reconciliation before real provider I/O.
3. Implement Stripe/provider adapter and webhook/event correlation without leaking provider SDK types across the Payments public API.
4. Add retry-safe payment finalization/recovery, then handle late success, payment retry, cancellation races, refunds, and automated recovery only as justified by explicit failure cases.

Nuxt source-layout migration, SEO, dependency upgrades, caching, and AI/agent features remain separate backlog tracks and should not displace the payment-lifecycle system-design sequence unless priorities intentionally change.
