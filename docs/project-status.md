# Project Status

Last updated: 2026-08-31

## Current state

Components Marketplace remains a self-contained Nuxt e-commerce portfolio demo. The Nuxt 4 migration and the recent buyer-flow stabilization work remain in place, while the current architecture track is now focused on making checkout/order behavior explicit and safe rather than adding more surface-area features.

System-design steps #6 and #7 are complete at the design level:

- [`docs/system-design/06-domain-boundaries-and-ownership.md`](system-design/06-domain-boundaries-and-ownership.md) defines authoritative ownership for Catalog, Cart, Inventory, Orders, Payments, Accounts, and checkout/application workflows, including retry, expiry, reservation, cart-revision, and payment-recovery invariants.
- [`docs/system-design/07-public-module-contracts-and-dependency-graph.md`](system-design/07-public-module-contracts-and-dependency-graph.md) defines the modular-monolith dependency direction, public module contracts, module firewall, retry/idempotency semantics, and adversarial checkout/payment/cancellation contracts.
- `tests/server-module-boundaries.spec.ts` actively protects the module-internal import boundary and records the first three checkout race-condition contracts to activate during implementation.

The existing mock server still mixes transport, cart, order, pricing, inventory-like, and payment responsibilities. The next phase is therefore a vertical implementation migration rather than another broad design pass.

## Current planning controls

- [System Design #6](system-design/06-domain-boundaries-and-ownership.md) is the source of truth for business ownership and transaction/recovery invariants.
- [System Design #7](system-design/07-public-module-contracts-and-dependency-graph.md) is the source of truth for module APIs and allowed dependency direction.
- [Feature Prioritization Audit](plans/2026-07-09-feature-prioritization-audit.md) still defines the broader portfolio-demo cleanup constraints.
- [Refactor Stabilization and Review Documentation PRD](prds/2026-07-09-refactor-stabilization-prd.md) remains the broader stabilization reference.
- GitHub Issues remain the task queue; `PROGRESS.md` mirrors the active implementation focus and verification baseline.

## Next work

Implement the architecture as small vertical slices, beginning with `PlaceOrder`:

1. Introduce the minimal public module seams required by `PlaceOrder`.
2. Move checkout orchestration out of `server/api/orders/new.post.ts` into the application layer.
3. Make duplicate `PlaceOrder` submissions idempotent and activate the first pending checkout contract test.
4. Preserve current mock-mode behavior while replacing direct cross-domain utility coupling incrementally.
5. Continue afterward with payment finalization and cancellation/recovery rather than expanding module structure prematurely.
