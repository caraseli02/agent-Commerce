# Project Status

Last updated: 2026-09-02

## Current state

Components Marketplace remains a self-contained Nuxt e-commerce portfolio demo. The Nuxt 4 migration and the recent buyer-flow stabilization work remain in place, while the current architecture track is now focused on making checkout/order behavior explicit and safe rather than adding more surface-area features.

System-design steps #6 and #7 are complete at the design level, and the first
checkout vertical slice is now implemented and production-hardened:

- [`docs/system-design/06-domain-boundaries-and-ownership.md`](system-design/06-domain-boundaries-and-ownership.md) defines authoritative ownership for Catalog, Cart, Inventory, Orders, Payments, Accounts, and checkout/application workflows, including retry, expiry, reservation, cart-revision, and payment-recovery invariants.
- [`docs/system-design/07-public-module-contracts-and-dependency-graph.md`](system-design/07-public-module-contracts-and-dependency-graph.md) defines the modular-monolith dependency direction, public module contracts, module firewall, retry/idempotency semantics, and adversarial checkout/payment/cancellation contracts.
- `tests/server-module-boundaries.spec.ts` actively protects the module-internal import boundary.
- PR #523 delivered durable PostgreSQL-backed `PlaceOrder` persistence,
  cross-instance idempotency, canonical order reads/history, revision-aware
  cart completion, authoritative checkout pricing, and deployed buyer-flow
  verification.

`PlaceOrder` now uses a thin Nitro adapter and an application workflow over
public Cart, Catalog, Inventory, Orders, and Payments APIs. Payment
finalization, provider-event recovery, and cancellation remain future
workflows; legacy utilities outside the completed slice remain migration
context, not the current `PlaceOrder` implementation.

## Current planning controls

- [System Design #6](system-design/06-domain-boundaries-and-ownership.md) is the source of truth for business ownership and transaction/recovery invariants.
- [System Design #7](system-design/07-public-module-contracts-and-dependency-graph.md) is the source of truth for module APIs and allowed dependency direction.
- [Feature Prioritization Audit](plans/2026-07-09-feature-prioritization-audit.md) still defines the broader portfolio-demo cleanup constraints.
- [Refactor Stabilization and Review Documentation PRD](prds/2026-07-09-refactor-stabilization-prd.md) remains the broader stabilization reference.
- GitHub Issues remain the task queue; `PROGRESS.md` mirrors the active implementation focus and verification baseline.

## Next work

Implement the next architecture vertical slice: `finalizePayment`.

1. Ingest payment outcomes through the Payments boundary and deduplicate
   duplicate or late success events.
2. Converge successful payment, allocation/commit, Order settlement, and
   revision-safe cart completion through an idempotent application workflow.
3. Recover safely when payment success races reservation expiry or an
   unresolved provider outcome.
4. Keep live Stripe-provider integration behind the pending #121 decision.
