# agent-Commerce Progress

## Current focus

- Production-harden the existing `PlaceOrder` vertical slice from
  `docs/system-design/place-order-production-hardening.md` before any
  `finalizePayment` work.
- Preserve the modular-monolith dependency direction: Nitro adapter → checkout
  application workflow → public Cart/Catalog/Inventory/Orders/Payments APIs.

## In progress

- None. PlaceOrder production hardening is complete and awaiting PR #523 review/merge.

## Completed PlaceOrder hardening

- PostgreSQL through `DATABASE_URL` is the only checkout persistence
  engine in local development, tests/CI, Vercel preview, and production.
- Order create/read/list is canonical, checkout claims are database-enforced,
  cart completion revision-aware, and inventory/payment state durable.
- Authenticated customer pricing is reconciled through the server Catalog quote;
  the demo STM32 price is `999.99 × 95% = 949.99 Lei` in the line, Payment
  Summary, PlaceOrder snapshot, success read, and history read.
- Fresh carts start empty. No `finalizePayment` implementation is included.

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

## Blocked / known baseline failures

- None for the PlaceOrder production-hardening slice.

## Next checkpoint

1. Review and merge PR #523.
2. Only after merge, resume the system-design sequence with `finalizePayment`.
