# agent-Commerce Progress

## Current focus

- First payment-lifecycle hardening slice on
  `codex/payment-preparation-boundary`.
- Preserve the modular-monolith direction: Nitro adapter → checkout workflow
  → public Cart/Catalog/Inventory/Orders/Payments APIs.

## Payment preparation tracking

- Designed: one logical local Payment per Order/checkout; provider attempts are
  subordinate future records, not additional local Payments.
- Implemented: Sol owns checkout schema/workflow changes; Luna owns this
  documentation and tracking slice.
- Tested: focused PostgreSQL/payment-preparation suite, strengthened race test,
  typecheck, and built buyer-path browser E2E all pass; full handoff remains
  pending.
- Merged: merge is not requested for this task; this remains one reviewable
  PR/branch.
- Scope: atomically persist checkout claim, authoritative Order snapshot,
  reservation, Payment, and correlations before provider continuation.
- Deferred: provider SDKs, webhooks, refunds, queues, outbox/cron recovery,
  retry-payment UX, cancellation, and late-payment allocation policy.

## In progress

- Sol implementation and Terra focused tests cover preparation idempotency,
  crash resume, concurrent duplicates, input conflict, source-revision cart
  recovery, and provider-call separation. The strengthened original-snapshot
  race test also passes.
- Preserve post-commit mock completion for the portfolio flow. A continuation
  crash remains `payment_pending`; a failure after local `PAID` is
  `recovery_required`. Production finalization and reconciliation remain
  deferred.

## Blocked / known baseline failures

- Fresh initialization passed on 2026-09-08: `build`, `lint`, `typecheck`, and
  74 Vitest files with 337 passed and 2 todo. This is historical baseline
  evidence, not payment-preparation verification.
- Parent focused command passed on 2026-09-09: five files, 31 tests, 70.49s
  (`corepack pnpm test tests/payment-preparation.spec.ts
tests/place-order.spec.ts tests/place-order-persistence.spec.ts
tests/cart-session-persistence.spec.ts tests/checkout-postgres-boundary.spec.ts`).
- `corepack pnpm typecheck` passes from both Sol and Terra. Full handoff
  verification remains pending; no PR has been created, and merge is not
  requested for this task.
- Built E2E buyer-path command passed on 2026-09-09: 4 tests, 58.0s,
  covering account history, guest checkout entry, mock failure UI, and actual
  mock checkout success.
- Strengthened race check passed on 2026-09-09: 1 targeted test with 9 skipped,
  3.36s, after asserting the injected serialization failure occurred.

## Verification baseline

- Historical PlaceOrder hardening merged as PR #526 at `e6de8c63`; its evidence
  is baseline context only and does not claim this slice is implemented.
- Focused test, typecheck, race, and browser E2E evidence are recorded above.
  Full handoff verification and PR creation remain pending; merge is not
  requested for this task.

## Next verification

1. Complete full handoff verification.
2. Package the reviewable PR; do not claim merge for this task.
