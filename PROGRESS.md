# agent-Commerce Progress

## Current focus

- System design #6 and #7 are accepted and committed. The active architecture work now moves from documentation to implementation.
- First vertical slice: implement `PlaceOrder` behind an application-layer seam, introduce only the public module contracts it needs, and activate the duplicate-checkout idempotency contract test.
- Preserve mock-mode behavior while removing orchestration from `server/api/orders/new.post.ts` incrementally; do not turn the project into a microservice/saga framework exercise.

## In progress

- Checkout architecture migration from `server/api` + `server/utils` coupling toward:

  ```text
  Nitro API
    -> application workflow
      -> public module contracts
        -> private module internals
  ```

- `tests/server-module-boundaries.spec.ts` already enforces that API/application code cannot import module internals and that one module cannot import another module's internals.
- Three adversarial checkout contracts are recorded for implementation: duplicate `PlaceOrder`, duplicate/late payment success, and cancellation while payment is processing.

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

- `./scripts/validate-feature-list.sh`
- `pnpm verify` — fast default gate
- `pnpm verify:full` — architecture invariants and preview smoke
- `pnpm verify:handoff` — clean-tree handoff gate

## Human decisions pending

- #316 (`ready-for-human`) — choose severity:low auto-merge versus evaluator policy.
- #121 (`ready-for-human`) — decide the production Stripe payment integration plan (HITL). The current checkout architecture may model the Payments boundary without forcing the real provider integration yet.

## Next implementation checkpoint

`PlaceOrder` is complete only when:

1. the API route is a thin transport adapter;
2. orchestration lives in `server/application/checkout`;
3. involved modules are accessed through public entry points;
4. the same checkout request returns the same logical order;
5. conflicting idempotency-key reuse is rejected;
6. the same cart revision cannot create two active orders through different request IDs;
7. the first pending checkout contract test becomes an executable passing test.
