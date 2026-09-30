# agent-Commerce Progress

## Current focus

- Checkout/order hardening through PR #550 is merged on `main`.
- Epic #535 child issues (#537-#547) are reconciled and closed where current-main implementation, focused coverage, and preview-browser evidence met their acceptance criteria.
- PR #552 merged the accepted Stripe provider/recovery ADR as `cd3036a1`.
- Issues #554 and #555 are complete. PRs #565-#568 merged #557's Payment reconciliation, verified-event ledger, signed webhook ingress, and normal paid-finalization slices. PRs #570-#571 merged provider-canceled checkout terminalization and explicit restart; PRs #572-#574 merged reservation re-establishment, unpaid backend resume, and its public route. PR #576 merged migration 006 (paid-recovery decision and compensation claim statuses) as 5f428295; its development and Production migration application was verified read-only. #557 remains the sole active issue for late-paid recovery and compensation. Stripe provider activation remains off.

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
- WIP is #557 only. #554 and #555 are closed. All nine #557 PR slices through #574 and tracking PR #575 (`77618d25`) are merged. The next implementation slice on `codex/557-paid-recovery-claim-schema` adds persistence only for late-paid recovery.

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

- #557 claim-schema slice — migration 006 adds nullable `paid_recovery_decision` (`ALLOCATE/BACKORDER/REFUND`) and permits `compensation_pending` / `compensation_recovery_required`. Existing rows, statuses, tuple constraints, and old writer SQL remain compatible. No decision selection, Order/Inventory transition, Refund operation, webhook acknowledgment change, UI, or activation is included; #557 and #558 remain open.
- #557 local-compensation slice — explicit REFUND commit atomically persists Order On Hold + Paid history and claim compensation_pending. Both signed-success finalization and stale PlaceOrder replay check the durable REFUND decision under the claim lock; compensation errors never reset the claim to ordinary recovery. Automatic ALLOCATE/BACKORDER/REFUND selection, provider continuation and settlement/failure application remain follow-up work. Stripe activation remains off.

## Blocked / known baseline failures

- No #535 acceptance-criteria defect remains.
- Sandbox-only `./init.sh` encountered npm DNS denial; the escalated rerun passed installation, build, lint, typecheck, and the PostgreSQL suite (89 files, 468 passed, 2 todo) before this slice's tests were added.
- The ignored local `.env.local` now uses a valid stable `vercel-dev` Neon connection, with pooled application and direct migration/test URLs. No credential is stored in tracked files.
- PR #560 PostgreSQL CI passed `pnpm verify`: 81 test files, 378 tests passed, 2 todo. The focused `checkout-postgres-boundary.spec.ts` suite passed all 7 tests. The PR template check and Vercel deployment passed; independent schema evaluation found no code defects and rated the slice 9/10. PR #560 merged as `1a61a252`.
- PR #561's earlier isolated PostgreSQL 17 CI passed `pnpm verify`: 81 test files, 387 tests passed, 2 todo, including Payment replay/marker guards. The PR template checker and Vercel deployment passed. Preview browser smoke completed a signed-in mock card checkout through `/order-summary` to `/checkout/success?id=ord-1790087040552-4581`, showing Payment Confirmed and RON 2,846.13.
- The guest Preview 401 was traced to `orders/new` and `orders/[id]` reading the raw process environment instead of Nuxt runtime config. Both routes now use `useRuntimeConfig(event)`, and regression coverage proves guest creation/read when the raw variable is unavailable. Local `pnpm verify` passes against Neon: 81 files, 388 tests passed, 2 todo. The updated Preview completed anonymous card checkout to `/checkout/success?id=ord-1790109683758-7502`, showing Payment Confirmed and RON 198.39; its guest-owned detail page then loaded `#ORD-490430` with Payment Status Paid and the same total. Final-head PostgreSQL CI passed, and the independent evaluator returned PASS, 10/10, with no findings or testing gaps.
- The final #554 slice's focused Payment preparation suite passes 27/27 against an isolated Neon test schema, including legacy-column replay and the pre-#561 old-writer SQL probe. The two changed tests pass again after preserving legacy-column compatibility writes. `pnpm typecheck`, `pnpm lint`, and changed-file Prettier checks pass. The guest checkout Playwright flow passes on port 3107 against an isolated PostgreSQL schema. A read-only query of the configured development database found migration tracking for 001/002/003 with repository-matching checksums and the expected Payment constraints; the separate Production Neon branch was not queried.
- #555 focused PostgreSQL adapter tests pass 17/17, including reviewer-requested overlapping-create and in-flight cancellation-success races. The clean-tree `pnpm verify:handoff` gate passed: build, lint, typecheck, 82 test files with 407 passed and 2 todo, feature-list validation, architecture checks, route smoke, and clean-state validation. The isolated PostgreSQL guest checkout browser flow passed 1/1. Independent standards review found no hard violation, and independent correctness review found no confirmed defect. `./init.sh` could not fetch pnpm metadata from npm in the sandbox, but the Stripe SDK was installed with escalated registry access.
- PR #564 was independently evaluated PASS (10/10), passed GitHub CI and Vercel, and merged into `main` as `3bb7479b` on 2026-09-25.
- #557 first-slice focused PostgreSQL adapter suite passes 25/25. The repaired-head clean-tree `pnpm verify:handoff` gate passed: build, lint, typecheck, 82 files with 415 passed and 2 todo, architecture checks, route smoke, and clean-state validation. Isolated PostgreSQL guest checkout Playwright passed 1/1. Independent spec and standards reviews found no remaining issue after the transaction-ready Payment transition helper was extracted.
- #557 second-slice local verification passes: focused Stripe tests 37/37 (including the 12/12 verified-event suite after the final race case), migration boundary 7/7, `pnpm verify:full` and clean-tree `pnpm verify:handoff` with build/lint/typecheck/architecture/smoke and 83 test files (427 passed, 2 todo), and isolated PostgreSQL guest checkout Chromium 1/1. Independent GPT-6 Sol spec/correctness review found no findings; GPT-6 Luna standards review found no hard violations. PR #566 passed GitHub CI, the latest PR-template check, Vercel, and CodeRabbit at implementation head `180a1eee`; independent evaluator PASS 10/10.
- PR #566 merged into `main` as `ea2b66ef` on 2026-09-25. PR #567 implementation head `889472a9` passed focused Stripe ingress/route/event-ledger tests 22/22 against isolated PostgreSQL; `pnpm verify:full` and clean-tree `pnpm verify:handoff` passed with 85 files (437 passed, 2 todo), build, lint, typecheck, architecture checks, and route smoke. Isolated guest checkout Chromium passed 1/1, the built default-off webhook route returned HTTP 503, and the normal pre-push hook passed 437 tests plus 9 visual checks. GitHub CI, latest PR-template check, Vercel, Vercel Preview Comments, and CodeRabbit passed; GitHub reported MERGEABLE/CLEAN. Independent GPT-6 Sol evaluator returned PASS 10/10. Stripe CLI is unavailable locally, so SDK-signed tests and official Stripe webhook documentation cover signature behavior; live signed HTTP delivery remains for later sandbox validation.
- #557 fourth-slice local verification: focused signed-ingress/route/paid-finalization tests passed 17/17 against isolated PostgreSQL. `pnpm verify:full` and committed-head clean-tree `pnpm verify:handoff` passed with 86 files (444 passed, 2 todo), build, lint, typecheck, architecture checks, and route smoke. Isolated guest checkout Chromium passed 1/1. The built default-off webhook returned HTTP 503. Independent GPT-6 Astra spec/correctness and Luna standards reviews found no blocking issue.

## Remaining architecture

- The Stripe PaymentIntent create/recover/cancel adapter is merged behind a default-off gate. The current PlaceOrder runtime still uses mock payment continuation; no deployed path invokes Stripe provider I/O.
- #121 proposes `PENDING / PROCESSING / PAID / CANCELED`, one PaymentIntent per logical Payment, bounded idempotency, create/cancel coordination, webhook-driven finalization, durable ALLOCATE/BACKORDER/REFUND recovery, and explicit `ON_HOLD + compensation_pending` refund continuation.
- The ADR and compatible schema are merged. Stripe activation remains gated by #559's shared-database unsafe-writer proof.
- Cancellation/create races, provider-initiated cancellation, idempotency-window expiry, and paid-recovery/refund races are now defined in the ADR; proactive/background recovery remains later payment-lifecycle work.
- Do not add queues, brokers, microservices, or saga infrastructure unless a demonstrated recovery requirement justifies them.

## Verification baseline

- PR #550 reports `pnpm build`, `pnpm lint`, and `pnpm typecheck` passing.
- Its earlier full gate records 376 tests passed with 2 todo; the final product-SSR focused Vitest run passed 8 tests.
- The latest GitHub `verify` and Vercel Preview rebuild for the PR head passed.
- PostgreSQL persistence coverage now includes a deterministic last-stock race in which two independent customers compete for the same stock and exactly one checkout succeeds, producing one Order, one Payment, and one paid result.
- Earlier checkout hardening already includes PostgreSQL concurrency/replay/crash coverage, independent-instance behavior, production-preview route smoke, and authenticated buyer-flow evidence.

## Next work

1. Continue #557 with late-paid recovery/compensation application states and the payment-success webhook acknowledgment contract. Keep Stripe activation off. Then continue in dependency order:
   - #556 — Payment Element/card + 3DS UI after backend recovery is available;
   - #558 — mutually exclusive late-success decision, `ON_HOLD` compensation continuation, full Refund, and refund webhooks;
   - #559 — unsafe-writer retirement + cross-version replay + Stripe activation gate, then Vercel validation and later schema contract gate.
2. Do not activate Stripe while any shared-database deployment can execute mock `continuePayment()/completePayment()`; #559 owns that proof. #556 must not start before #557's backend recovery contract is available.
3. Keep provider-attempt persistence, partial refunds, app-owned saved cards, manual capture, and background queues deferred until a demonstrated requirement justifies them.

## Next verification

- PR #576 migration 006 is merged at 5f428295. Focused schema tests 8/8, clean-tree handoff, normal pre-push, GitHub CI/Vercel and independent evaluator PASS 10/10 were completed before human merge; the ledger and actual constraints were checked read-only on development and Production. Migration presence alone was not treated as application evidence.
- Current compensation slice: fresh Node 24.14.0 initialization passed build/lint/typecheck and 91 files (489 passed, 2 todo). Changed-file ESLint and typecheck pass. Sprint contract: https://github.com/caraseli02/agent-Commerce/issues/557#issuecomment-5918554278. Focused compensation/finalization and PlaceOrder suites pass 48/48. A fresh isolated-PostgreSQL Chromium preview on port 3019 completes guest checkout, then renders On Hold + Paid on an admin Order detail and after reload (1/1). The first guest-detail display attempt exposed a pre-existing null-user adminSettings error in payment-info.helper.ts; no unrelated repair is included. Clean-tree delivery checks, CI and independent final-head evaluation are the next handoff steps; the linked PR/issue records their exact outcomes.
- #557 first PR (#565): merged at `34797a9b`; GitHub CI and Vercel passed, independent evaluator PASS 10/10. Focused PostgreSQL suite, clean handoff gate, mock guest checkout browser smoke, and independent issue/ADR diff review passed.
- #557 second PR (#566): merged at `ea2b66ef` after clean-tree handoff, GitHub CI, latest PR-template check, Vercel, and independent evaluator passed.
- #557 third PR (#567): merged as `a3308698` after focused signed webhook/route tests, `pnpm verify:full`, clean-tree handoff, default-off HTTP 503 route smoke, mock guest checkout browser flow, GitHub CI, Vercel, and independent evaluator passed. Stripe remains off; live signed HTTP sandbox validation belongs before activation.
- #557 fourth slice: PR #568 merged as `b9817835` after focused PostgreSQL suite, full gate, clean-tree handoff, default-off HTTP 503 smoke, mock guest checkout Chromium, GitHub CI, Vercel, and independent evaluator PASS 10/10.
- #557 fifth slice: PR #570 merged as `c338f120` after focused isolated-PostgreSQL tests 36/36, full and clean-tree handoff gates (87 files, 453 passed, 2 todo), default-off webhook HTTP 503, guest checkout Chromium 1/1, GitHub CI/Vercel/CodeRabbit, and final-head GPT-6 Sol evaluator PASS 10/10.
- #557 sixth slice: PR #571 merged as `91d26ba8` after focused isolated-PostgreSQL restart and existing API tests 11/11, `pnpm verify:full` and clean-tree `pnpm verify:handoff` (88 files, 459 passed, 2 todo), built-server guest HTTP restart → fresh quote → new Order, GitHub CI/Vercel, and independent GPT-6 Astra evaluator PASS 10/10.
- #557 seventh slice: PR #572 merged as `cf0eac9f` after focused isolated-PostgreSQL re-establishment tests 9/9, full and clean-tree handoff gates (89 files, 468 passed, 2 todo), guest checkout Chromium 1/1, GitHub CI/Vercel, and independent GPT-6 Astra evaluator PASS 10/10.
- #557 eighth slice: PR #573 merged as `336d1ddd`. Focused isolated-PostgreSQL resume and reservation suites passed 20/20; final-head clean-tree handoff passed 90 files (479 passed, 2 todo), guest checkout Chromium 1/1, pre-push visual checks 9/9, GitHub CI/Vercel, and independent GPT-6 Astra evaluation PASS 10/10. No public resume route or UI was included.
- #557 ninth slice: PR #574 merged as `d7f0fafa` on 2026-09-30. Focused public route and isolated-PostgreSQL resume/reservation suites passed 29/29. Full and clean-tree handoff gates passed build/lint/typecheck, 91 files (488 passed, 2 todo), feature/architecture checks, and preview route smoke. Built default-off resume HTTP returned 503 for an existing guest and 401 without an owner; isolated guest checkout Chromium passed 1/1. GitHub CI/template/Vercel/CodeRabbit passed, and independent GPT-6 Astra evaluation returned PASS 10/10 with no findings.
- Later provider PRs must validate local Stripe sandbox/CLI behavior and Vercel Preview + Stripe sandbox behavior before activation.
