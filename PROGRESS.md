# agent-Commerce Progress

## Current focus

- Checkout/order hardening through PR #550 is merged on `main`.
- Reconcile epic #535 child-issue state and evidence against current `main`; do not reopen already-landed checkout fixes without a reproduced gap.
- The next major system-design frontier after that reconciliation is issue #121: external payment-provider ownership, provider idempotency, unknown-outcome reconciliation, webhooks, and retry-safe payment finalization.

## Completed checkout hardening

- PR #523 made PostgreSQL the authoritative checkout persistence engine across independent requests/instances and established durable checkout claims, Orders, reservations, and payment state.
- PR #526 made persisted Orders the canonical read model and carried one server-authoritative quote through checkout, persistence, confirmation, and history.
- PR #529 established the commit-before-provider boundary: one local `PENDING` Payment and its Order/reservation identities are persisted before payment continuation; provider continuation runs outside the retryable checkout transaction.
- PR #533 finalizes paid Inventory/Order/checkout state before best-effort, revision-aware Cart cleanup so a newer cart revision is never destroyed by an older checkout.
- PR #543 closed #536 by requiring the server-issued cart revision and quote fingerprint and rejecting stale reviews before Order, Payment, or reservation creation.
- PRs #548 and #549 repaired the remaining browser QA regressions around cart-change recovery, checkout drafts, saved-card reselection, tracking privacy/return behavior, transaction scope, and order-history behavior.
- PR #550 hardened shared pricing/credit behavior, saved addresses, sign-out draft isolation, stock boundaries and concurrent last-stock checkout, payment reselection/result states, order-history no-match handling, and protected-preview product SSR.

## Active tracking

- #536 is closed/completed and is tracked as `passing`.
- Epic #535 remains `active` only because its child issues (#537-#547) are still open and need acceptance-criteria reconciliation against the merged implementation. Their open state must not be interpreted as proof that the reported defects still reproduce.
- Keep WIP at one: finish the #535 evidence/issue reconciliation before promoting the provider-integration track to active implementation.

## Remaining architecture

- Real provider I/O is still absent. The current Payments implementation has durable local `PENDING` / `PAID` / `FAILED` state but mock payment continuation.
- Provider-attempt ownership/idempotency, timeout/unknown-result reconciliation, webhook signature/event handling, duplicate/out-of-order event safety, retry-safe `finalizePayment`, late-success policy, payment retry, cancellation races, refunds, and automated recovery remain future payment-lifecycle work.
- Do not add queues, brokers, microservices, or saga infrastructure unless a demonstrated recovery requirement justifies them.

## Verification baseline

- PR #550 reports `pnpm build`, `pnpm lint`, and `pnpm typecheck` passing.
- Its earlier full gate records 376 tests passed with 2 todo; the final product-SSR focused Vitest run passed 8 tests.
- The latest GitHub `verify` and Vercel Preview rebuild for the PR head passed.
- PostgreSQL persistence coverage now includes a deterministic last-stock race in which two independent customers compete for the same stock and exactly one checkout succeeds, producing one Order, one Payment, and one paid result.
- Earlier checkout hardening already includes PostgreSQL concurrency/replay/crash coverage, independent-instance behavior, production-preview route smoke, and authenticated buyer-flow evidence.

## Next work

1. Reconcile each open #535 child issue against current `main`; close only when its acceptance criteria are demonstrably satisfied and record any genuinely remaining gap.
2. Once #535 tracking is truthful, start the #121 payment-provider ADR/design decision.
3. Then implement provider-attempt identity/idempotency, Stripe adapter behavior, webhook/reconciliation handling, and retry-safe payment finalization in separate failure-oriented slices.
