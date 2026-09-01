# agent-Commerce Progress

## Current focus

- Production-harden the existing `PlaceOrder` vertical slice from
  `docs/system-design/place-order-production-hardening.md` before any
  `finalizePayment` work.
- Preserve the modular-monolith dependency direction: Nitro adapter → checkout
  application workflow → public Cart/Catalog/Inventory/Orders/Payments APIs.

## In progress

- Use PostgreSQL through `DATABASE_URL` as the only checkout persistence
  engine in local development, tests/CI, Vercel preview, and production.
- Make order create/read/list canonical, checkout claims database-enforced,
  cart completion revision-aware, and inventory/payment state durable.
- Reconcile authenticated customer pricing through the server Catalog quote;
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
- `pnpm verify:handoff`: pass — build, lint, typecheck, PostgreSQL-backed
  coverage suite (314 passed + 2 todo), architecture invariants, built-preview
  route smoke, and clean-state validation.
- `pnpm test:e2e` now starts its own built Nitro server and cannot reuse a
  separately started server with the wrong database schema.
- No GitHub CI, Vercel deployment, evaluator, or deployed-preview evidence is
  claimed for the current unpushed commit.

## Blocked / known baseline failures

- The Vercel/Neon Preview configuration and all deployed-buyer evidence remain
  outstanding for this current commit. Before the deployed buyer smoke, enable
  Preview Branching/connect Preview in Vercel Storage, then deploy the PR so
  its build can run `pnpm db:migrate` against the preview branch.

## Next checkpoint

1. Enable Neon Preview Branching/connect Preview in Vercel Storage and deploy
   PR #523.
2. Run the 13-step buyer smoke from the production-hardening handoff against
   the deployed preview.
3. Record the deployed evidence, mark `SD-PLACE-ORDER-HARDENING` passing, and
   run `pnpm verify:handoff` from the final clean tree.
