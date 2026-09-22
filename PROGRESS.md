# agent-Commerce Progress

## Current focus

- Checkout/order hardening through PR #550 is merged on `main`.
- Epic #535 child issues (#537-#547) are reconciled and closed where current-main implementation, focused coverage, and preview-browser evidence met their acceptance criteria.
- PR #552 merged the accepted Stripe provider/recovery ADR as `cd3036a1`.
- Issue #554 is active on `codex/554-payment-state-compatibility`. PR #560 merged the compatible PostgreSQL Payment schema as `1a61a252`; PR #561 makes mock checkout fail closed for transitional Payment states and provider markers and repairs deployed guest checkout runtime-config detection. Stripe provider activation remains off.

## Completed checkout hardening

- PR #523 made PostgreSQL the authoritative checkout persistence engine across independent requests/instances and established durable checkout claims, Orders, reservations, and payment state.
- PR #526 made persisted Orders the canonical read model and carried one server-authoritative quote through checkout, persistence, confirmation, and history.
- PR #529 established the commit-before-provider boundary: one local `PENDING` Payment and its Order/reservation identities are persisted before payment continuation; provider continuation runs outside the retryable checkout transaction.
- PR #533 finalizes paid Inventory/Order/checkout state before best-effort, revision-aware Cart cleanup so a newer cart revision is never destroyed by an older checkout.
- PR #543 closed #536 by requiring the server-issued cart revision and quote fingerprint and rejecting stale reviews before Order, Payment, or reservation creation.
- PRs #548 and #549 repaired the remaining browser QA regressions around cart-change recovery, checkout drafts, saved-card reselection, tracking privacy/return behavior, transaction scope, and order-history behavior.
- PR #550 hardened shared pricing/credit behavior, saved addresses, sign-out draft isolation, stock boundaries and concurrent last-stock checkout, payment reselection/result states, order-history no-match handling, and protected-preview product SSR.

## Active tracking

- #536 and #535 are closed/completed and tracked as `passing`.
- The #535 reconciliation closed #537-#542 and #544-#547 after matching their acceptance criteria to PRs #543, #548, #549, and #550 plus current preview-browser checks; #543 was already merged/closed. No new defect was reproduced.
- WIP is #554 only. The merged schema PR precedes this focused application Payment-state compatibility slice.

## Reconciliation evidence

- #537: shared-price coverage and a product → order-summary → refresh browser check kept the 999.99 Lei line subtotal and 1,209.89 Lei named total stable.
- #538: stock boundary/race coverage plus preview rejection of 151 against 150 available.
- #539/#543: 409 cart/quote validation is distinct from payment failure; cart-empty recovery coverage returns the buyer to cart review.
- #540: refresh restored a valid prepared checkout and left Secure Checkout enabled.
- #541: the preview exposed the 3,800.00 Lei available / 162,810.12 Lei required credit explanation and alternative methods.
- #542: unsigned tracking renders only the account sign-in gate; tracking-privacy coverage exercises the owner return path.
- #544: Transaction History displayed linked Paid rows for completed orders with matching identifier, type, date, and amount.
- #545: exact `ORD-525044` browser search reduced four rows to the single match after its debounce; the no-match test also covers recovery.
- #546: signed-in checkout displayed complete billing and default shipping addresses.
- #547: draft-clear-on-sign-out coverage and the independent guest/customer carts in the preview confirmed identity isolation.

## In progress

- #554 — protect PlaceOrder finalization from `PROCESSING` / `CANCELED` / legacy `FAILED` states and refuse mock completion after Stripe create/identity/cancellation markers appear.

## Blocked / known baseline failures

- No #535 acceptance-criteria defect remains.
- `./init.sh` cannot install from npm in this environment (`ENOTFOUND registry.npmjs.org`); existing dependencies are installed.
- The ignored local `.env.local` now uses a valid stable `vercel-dev` Neon connection, with pooled application and direct migration/test URLs. No credential is stored in tracked files.
- PR #560 PostgreSQL CI passed `pnpm verify`: 81 test files, 378 tests passed, 2 todo. The focused `checkout-postgres-boundary.spec.ts` suite passed all 7 tests. The PR template check and Vercel deployment passed; independent schema evaluation found no code defects and rated the slice 9/10. PR #560 merged as `1a61a252`.
- PR #561's earlier isolated PostgreSQL 17 CI passed `pnpm verify`: 81 test files, 387 tests passed, 2 todo, including Payment replay/marker guards. The PR template checker and Vercel deployment passed. Preview browser smoke completed a signed-in mock card checkout through `/order-summary` to `/checkout/success?id=ord-1790087040552-4581`, showing Payment Confirmed and RON 2,846.13.
- The guest Preview 401 was traced to `orders/new` and `orders/[id]` reading the raw process environment instead of Nuxt runtime config. Both routes now use `useRuntimeConfig(event)`, and regression coverage proves guest creation/read when the raw variable is unavailable. Local `pnpm verify` passes against Neon: 81 files, 388 tests passed, 2 todo. The updated Preview completed anonymous card checkout to `/checkout/success?id=ord-1790109683758-7502`, showing Payment Confirmed and RON 198.39; its guest-owned detail page then loaded `#ORD-490430` with Payment Status Paid and the same total.

## Remaining architecture

- Real provider I/O is still absent. The current Payments implementation has durable local `PENDING` / `PAID` / `FAILED` state but mock payment continuation.
- #121 proposes `PENDING / PROCESSING / PAID / CANCELED`, one PaymentIntent per logical Payment, bounded idempotency, create/cancel coordination, webhook-driven finalization, durable ALLOCATE/BACKORDER/REFUND recovery, and explicit `ON_HOLD + compensation_pending` refund continuation.
- The ADR and compatible schema are merged. The current runtime still uses mock payment continuation and must remain Stripe-inactive while the application compatibility work lands.
- Cancellation/create races, provider-initiated cancellation, idempotency-window expiry, and paid-recovery/refund races are now defined in the ADR; proactive/background recovery remains later payment-lifecycle work.
- Do not add queues, brokers, microservices, or saga infrastructure unless a demonstrated recovery requirement justifies them.

## Verification baseline

- PR #550 reports `pnpm build`, `pnpm lint`, and `pnpm typecheck` passing.
- Its earlier full gate records 376 tests passed with 2 todo; the final product-SSR focused Vitest run passed 8 tests.
- The latest GitHub `verify` and Vercel Preview rebuild for the PR head passed.
- PostgreSQL persistence coverage now includes a deterministic last-stock race in which two independent customers compete for the same stock and exactly one checkout succeeds, producing one Order, one Payment, and one paid result.
- Earlier checkout hardening already includes PostgreSQL concurrency/replay/crash coverage, independent-instance behavior, production-preview route smoke, and authenticated buyer-flow evidence.

## Next work

1. Validate and review #554's Payment-state compatibility PR; then remove legacy Payment-column authority and add the remaining mixed-version activation-safety harness in later #554 work.
2. Continue implementation issues in dependency order:
   - #555 — PaymentIntent creation, bounded idempotency, and create/cancel coordination;
   - #557 — webhook/reconciliation, retry-safe fulfillment/compensation finalization, `resumeOrderPayment`, and terminal canceled-checkout restart;
   - #556 — Payment Element/card + 3DS UI after backend recovery is available;
   - #558 — mutually exclusive late-success decision, `ON_HOLD` compensation continuation, full Refund, and refund webhooks;
   - #559 — unsafe-writer retirement + cross-version replay + Stripe activation gate, then Vercel validation and later schema contract gate.
3. Do not activate Stripe while any shared-database deployment can execute mock `continuePayment()/completePayment()`; #559 owns that proof. #556 must not start before #557's backend recovery contract is available.
4. Keep provider-attempt persistence, partial refunds, app-owned saved cards, manual capture, and background queues deferred until a demonstrated requirement justifies them.

## Next verification

- For #554's Payment-state PR: require updated PostgreSQL CI on the final evidence head, then repeat independent evaluation and clean-state validation before returning PR #561 to human review.
- Later provider PRs must validate local Stripe sandbox/CLI behavior and Vercel Preview + Stripe sandbox behavior before activation.
