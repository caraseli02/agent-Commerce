# Project Status

Last updated: 2026-09-02

## Current state

Components Marketplace remains a self-contained Nuxt e-commerce portfolio demo. The Nuxt 4 migration and the recent buyer-flow stabilization work remain in place, while the current architecture track is now focused on making checkout/order behavior explicit and safe rather than adding more surface-area features.

System-design steps #6 and #7 are complete at the design level. The first
checkout vertical slice has a durable implementation foundation, but its full
production-hardening acceptance criteria are not yet complete:

- [`docs/system-design/06-domain-boundaries-and-ownership.md`](system-design/06-domain-boundaries-and-ownership.md) defines authoritative ownership for Catalog, Cart, Inventory, Orders, Payments, Accounts, and checkout/application workflows, including retry, expiry, reservation, cart-revision, and payment-recovery invariants.
- [`docs/system-design/07-public-module-contracts-and-dependency-graph.md`](system-design/07-public-module-contracts-and-dependency-graph.md) defines the modular-monolith dependency direction, public module contracts, module firewall, retry/idempotency semantics, and adversarial checkout/payment/cancellation contracts.
- `tests/server-module-boundaries.spec.ts` actively protects the module-internal import boundary.
- PR #523 delivered durable PostgreSQL-backed `PlaceOrder` persistence,
  cross-instance idempotency, revision-aware cart completion, and deployed
  buyer-flow verification.

`PlaceOrder` now uses a thin Nitro adapter and an application workflow over
public Cart, Catalog, Inventory, Orders, and Payments APIs. The remaining
hardening work is to make Orders detail/history reads one Orders-owned read
model and establish full UI-to-persisted checkout-total reconciliation. Payment
finalization, provider-event recovery, and cancellation follow only after that
work is complete.

## Current planning controls

- [System Design #6](system-design/06-domain-boundaries-and-ownership.md) is the source of truth for business ownership and transaction/recovery invariants.
- [System Design #7](system-design/07-public-module-contracts-and-dependency-graph.md) is the source of truth for module APIs and allowed dependency direction.
- [Feature Prioritization Audit](plans/2026-07-09-feature-prioritization-audit.md) still defines the broader portfolio-demo cleanup constraints.
- [Refactor Stabilization and Review Documentation PRD](prds/2026-07-09-refactor-stabilization-prd.md) remains the broader stabilization reference.
- GitHub Issues remain the task queue; `PROGRESS.md` mirrors the active implementation focus and verification baseline.

## Next work

Complete the remaining `PlaceOrder` hardening acceptance work.

1. Replace public route demo-order fallbacks with one Orders-owned read model.
2. Reconcile the server quote, UI summary, persisted order, success, and
   history totals through one policy.
3. Run the complete `PlaceOrder` hardening acceptance suite, then begin
   `finalizePayment`.
