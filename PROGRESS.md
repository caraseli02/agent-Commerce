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
  typecheck, built buyer-path browser E2E, smoke, and the verification gate all
  pass; visual and handoff gates expose documented unchanged-baseline
  exceptions.
- Handoff target: reviewable PR from `codex/payment-preparation-boundary`; not
  merged.
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
- `corepack pnpm typecheck` passes from both Sol and Terra. The handoff target
  is a reviewable PR from `codex/payment-preparation-boundary`; it is not
  merged.
- Built E2E buyer-path command passed on 2026-09-09: 4 tests, 58.0s,
  covering account history, guest checkout entry, mock failure UI, and actual
  mock checkout success.
- Strengthened race check passed on 2026-09-09: 1 targeted test with 9 skipped,
  3.36s, after asserting the injected serialization failure occurred.
- `corepack pnpm verify:handoff` passed build, bundle, lint, typecheck,
  coverage, feature-list, and UI checks: 75 files, 349 passed, 2 todo, 87.56s
  (46.47% statements, 37.97% branches, 40.11% functions, 47% lines).
- Normal `corepack pnpm verify` also passes with 75 files, 349 passed, and 2
  todo in 87.62s.
- The handoff architecture validator reports the unchanged tracked baseline
  `.agents/skills/impeccable/scripts/generate-image.mjs` manual Bearer headers
  at lines 410 and 416. Parent reproduced the finding from the exact base
  archive; this task does not alter that unrelated baseline.
- Built-preview smoke passed `/`, `/cart`, and `/checkout` with HTTP 200, and
  clean-state validation passed with 10 changed source files.
- The visual hook reported 7/9 cases passing; the two homepage cases fail at
  the existing mobile 96,449-pixel and desktop 623,075-pixel baselines. Exact-base commit
  `95bcef63` reproduces the same failures, and SHA-256 hashes of the actual
  PNGs match between the current source and the base. No snapshots were
  updated and no hook bypass was used; the UI is unchanged.

## Verification baseline

- Historical PlaceOrder hardening merged as PR #526 at `e6de8c63`; its evidence
  is baseline context only and does not claim this slice is implemented.
- Focused test, typecheck, race, and browser E2E evidence are recorded above.
  Code and tests are complete. Publication is blocked by the documented
  unchanged-baseline visual and architecture exceptions pending a one-time user
  exception; evaluator PR review has not started.

## Next verification

1. Resolve the one-time user exception for the unchanged baseline visual and
   architecture failures.
2. Publish the durable handoff target on `codex/payment-preparation-boundary`;
   keep this feature active until evaluator review passes.
