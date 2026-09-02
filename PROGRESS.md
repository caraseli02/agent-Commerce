# agent-Commerce Progress

## Current focus

- Complete the remaining `PlaceOrder` production-hardening acceptance gaps
  before beginning `finalizePayment`.
- Preserve the modular-monolith dependency direction: Nitro adapter → checkout
  application workflow → public Cart/Catalog/Inventory/Orders/Payments APIs.

## In progress

- Canonical Orders reads remain incomplete: the detail and history endpoints
  still retain static demo-order fallbacks instead of using one Orders-owned
  persisted/read-model source.
- Checkout commits server-quoted prices, but the UI independently derives VAT,
  shipping, and the final total. Full summary reconciliation is not yet proven.

## Delivered PlaceOrder hardening foundation

- PostgreSQL through `DATABASE_URL` is the only checkout persistence
  engine in local development, tests/CI, Vercel preview, and production.
- Checkout-created orders are durable and readable through the Orders module;
  checkout claims are database-enforced, cart completion is revision-aware, and
  inventory/payment state is durable.
- Server `PlaceOrder` persists Catalog-quoted merchandise, delivery, and
  small-order values; the demo STM32 line price is `949.99 Lei` for the
  authenticated customer.
- Fresh carts start empty. No `finalizePayment` implementation is included.
- PR #523 merged as `fa532db2`; its PostgreSQL-backed verification and deployed
  preview buyer smoke passed.

The implementation preserves the accepted architecture direction:

```text
Nitro API
  -> application workflow
    -> public module contracts
      -> private module internals
```

- `tests/server-module-boundaries.spec.ts` enforces that API/application code
  cannot import module internals and that one module cannot import another
  module's internals.

## Recently completed system-design work

- `docs/system-design/06-domain-boundaries-and-ownership.md`
  - Catalog owns current product/pricing policy.
  - Cart owns purchase intent and revision.
  - Inventory owns stock/reservations/backorders.
  - Orders own the immutable historical commercial snapshot and order lifecycle.
  - Payments own provider/payment truth.
  - Accounts own current customer information.
  - Application workflows own cross-domain sequencing.
  - Transaction/recovery invariants cover checkout idempotency, payment deadlines, immutable retry pricing, payment concurrency/unknown states, reservation/payment races, cart reconciliation, and reliable recovery.

- `docs/system-design/07-public-module-contracts-and-dependency-graph.md`
  - Defines public module firewalls and forbidden internal imports.
  - Uses narrow immutable DTOs instead of shared giant domain models.
  - Defines idempotent reservation/order creation, monotonic payment-event handling, conditional inventory transitions, changed-cart safety, and cancellation that waits for payment truth.
  - Keeps the target as a pragmatic modular monolith.

## Existing modernization baseline

- Repository identity is `caraseli02/agent-Commerce`; the Vercel project and deployment use `agentcommerce` / `agentcommerce.vercel.app`. Legacy project-name text, URLs, browser-test identifiers, and local environment settings were removed on 2026-09-01; `pnpm verify` and the deployed URL check passed.
- Nuxt 4 migration is complete and verified in mock mode.
- Zod 4 remains deferred until the stable vee-validate adapter supports it.
- TanStack Table 9 remains a separate dedicated migration; current Nuxt 4-compatible Table 8 / Virtual 3 stays in place.

## Verification baseline

- Root causes in the hardening handoff were rechecked against `origin/main` and
  all six were present.
- `pnpm db:migrate`: pass against the configured PostgreSQL development
  database, including the compatible legacy-schema migration path.
- Focused PostgreSQL migration/constraint and durable PlaceOrder suite: pass
  (9 tests), including concurrent migrators and `vi.resetModules()` replay,
  canonical read, and history list.
- `pnpm verify:full`: pass — build, lint, typecheck, PostgreSQL-backed coverage
  suite (320 passed + 2 todo), architecture invariants, and built-preview route
  smoke.
- Focused critical browser flows: pass (4/4), covering order-summary entry,
  customer sign-in and `949.99 Lei` reconciliation, successful PlaceOrder and
  success read-back, order history, and checkout failure handling.
- Pre-push verification: pass — `pnpm verify` plus visual browser matrix (9/9).
- `pnpm test:e2e` now starts its own built Nitro server and cannot reuse a
  separately started server with the wrong database schema.
- PR #523 checks pass: PostgreSQL-backed GitHub CI, PR template, Vercel build,
  and Vercel Preview Comments.
- Vercel preview migration/build pass against the connected Neon Preview
  database branch. Deployed cross-request smoke passes: fresh cart is empty,
  one STM32 Add yields quantity 1, authenticated price persists as `949.99`,
  replay returns the same order, canonical read/history return that order, cart
  completion is durable, and two request IDs racing one cart revision create at
  most one order. Runtime error logs are empty after the final smoke.
- PostgreSQL SSL aliases from Neon are normalized to `verify-full`, preserving
  certificate verification without the pg future-semantics runtime warning.

## Remaining acceptance gaps

- The two public Orders read endpoints still combine durable checkout orders
  with static demo orders.
- The client-side payment summary is not a server-returned final-money quote,
  so agreement across the quote, UI, persisted order, success, and history is
  not yet established by tests.

## Next checkpoint

1. Complete the canonical Orders read-model migration for detail and history.
2. Make final checkout-summary money server-authoritative or prove the UI and
   persisted values reconcile from the same policy.
3. Re-run the PlaceOrder acceptance checks before starting `finalizePayment`.
