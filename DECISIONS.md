# DECISIONS

Use this file for durable cross-session decisions that should survive context resets.

## Stripe provider ADR — 2026-09-20

- Use Stripe Payment Intents + Payment Element behind the Payments module boundary.
  - Reason: Stripe recommends Checkout Sessions for most integrations, but agent-Commerce intentionally owns its checkout/commercial state already; the provider's role is narrowed to collecting the immutable Order amount.
  - Impact: one local Payment maps to one reusable Stripe PaymentIntent; Checkout Session expiry/replacement and provider-session generations are not modeled in the first slice.
- Refine local Payment state to `PENDING / PROCESSING / PAID / CANCELED`, persist one explicit Stripe PaymentIntent ID, and retire ambiguous `provider_reference`.
  - Reason: PaymentIntent existence does not itself mean payment is processing; `PENDING` remains payable/retryable, `PROCESSING` means provider work is genuinely in flight/uncertain, and `CANCELED` means payment can no longer collect money.
  - Impact: recoverable declines return/remain `PENDING`; `PAID` cannot regress because of stale provider events or concurrent cancellation.
- Use one deterministic Payment-derived idempotency key for PaymentIntent creation and recover the same PaymentIntent after timeout/lost response.
  - Reason: a lost HTTP response is an unknown outcome, not evidence that another provider payment object should be created.
  - Impact: the first implementation needs no provider-attempt/session-generation table.
- Confirm the PaymentIntent client-side through Stripe.js / Payment Element; do not route card details or normal PaymentIntent confirmation through Nitro.
  - Reason: Stripe's browser components already own secure payment collection and authentication, while ECAS only needs to create/recover the PaymentIntent and later reconcile provider truth.
  - Impact: browser confirmation is not authoritative Order/payment completion; webhook/reconciliation still establish local truth and the application workflow still finalizes Orders/Inventory.
- Deduplicate Stripe webhooks durably by recording the event ID and corresponding local Payment transition in the same PostgreSQL transaction.
  - Reason: a crash must not mark a provider event handled without committing its local state change.
  - Impact: duplicate delivery is harmless; slow provider reconciliation stays outside the short local transaction.
- Model refunds as separate durable full-refund operations with `PENDING / SUCCEEDED / FAILED`; the original successful Payment remains `PAID`.
  - Reason: refund is a later financial fact, not a rewrite of payment history.
  - Impact: full refund is compensation for late/concurrent success or other accepted recovery cases; partial refunds, app-owned saved cards, manual capture, queues, and provider-attempt tables remain out of the first Stripe slice.

See `docs/system-design/08-stripe-payment-provider-and-recovery.md`.

## Epic #535 QA repair — 2026-09-14

- Keep checkout choices and guest contact/address data in `sessionStorage`, never durable browser storage, and persist only the payment type (not card details).
  - Reason: a refresh should not silently erase a valid checkout draft, while payment credentials must remain outside browser persistence.
  - Impact: successful checkout should clear this session draft in the completion flow; failed checkout can safely retry it.
- Derive transaction history only from authenticated customers' paid durable Orders.
  - Reason: demo fixture transactions can disagree with checkout truth and make failed attempts appear paid.
  - Impact: pending, failed, and duplicate checkout attempts are omitted; public callers receive 401.

## Post-merge QA follow-up — 2026-09-15

- Store only a saved-card identifier in a checkout session draft; restore it only when that card still exists, otherwise leave checkout disabled until the buyer selects payment again.
  - Reason: a payment type alone can silently switch a buyer to a different saved card after refresh.
  - Impact: card details remain outside browser storage and the refresh state is explicit.
- Clear checkout drafts on sign-out and when the authenticated identity changes.
  - Reason: a session draft may contain contact and address information that belongs to a prior account.
  - Impact: a later buyer never sees the prior buyer’s draft fields.

## PR #529 findings repair — 2026-09-11

- Retain and clear the guest cart during login merge instead of deleting it.
  Its revision sequence is part of durable checkout identity. Transfer and clear
  share a serializable transaction so repeated merges cannot duplicate items.
- Render checkout line amounts from the same quote as the summary. Allocate split
  stock/backorder totals complementarily to preserve cents; keep cart mutation
  state separate from display values.
- Historical order identity comes from the immutable snapshot. Missing fulfillment
  data is displayed as unavailable; it must not be inferred from ordered quantity.
- Hydration starts from server-visible state: header cart text waits for mount,
  footer auth links use the session cookie, and company details wait for order load.
- Exclude bundled `.agents` tooling from application architecture scanning, and
  accept only the reviewed homepage redesign snapshots inherited from PR #528.

## Format

- Date
- Decision
- Reason
- Impact

## Example

- 2026-06-12 — Use pnpm as the package manager

  - Reason: matches the repo and existing scripts
  - Impact: all install/run/verify commands should use pnpm

- 2026-06-12 — Use GitHub Issues as the task queue for autonomous work

  - Reason: issue labels and assignment prevent duplicate work better than ad hoc prompts
  - Impact: autonomous loops must claim `ready-for-agent` issues and keep WIP=1

- 2026-06-16 — Adopt the full Learn Harness Engineering minimal pack plus Components Marketplace topic docs

  - Reason: the repo needed explicit coverage for lectures 9–12: premature victory, full-pipeline verification, observability, and clean handoff
  - Impact: fresh sessions should use `./init.sh`, `docs/agents/session-lifecycle.md`, `docs/agents/verification.md`, and `docs/agents/harness-audit.md` before declaring work done

- 2026-06-17 — Use goal-shaped control for evaluator repair loops

  - Reason: a standing goal keeps the same issue alive after evaluator rejection instead of re-queuing failed work or asking Vlad to prompt the next step.
  - Impact: cron may wake the planner/generator/evaluator, but WIP remains 1; evaluator failures stay `in-progress`, generate a repair brief for the same branch/PR, and the Dev ship path immediately triggers evaluator review after every PR update.

- 2026-07-01 — Hide portfolio demo passwords in the account panel

  - Reason: demo reviewers need an obvious sign-in path, but visible passwords reduce trust and look less production-minded.
  - Impact: demo role selection may prepare sign-in internally, but the account panel should not render demo passwords in plain text.

- 2026-08-05 — Prefer **Buyer Flow** over **Scripted Buyer Path**

  - Reason: the design contract names a storefront capability, not a demo rehearsal script; “buyer flow” matches the FCC-style problem statement.
  - Impact: `CONTEXT.md` uses Buyer Flow as the glossary term; design doc lives at `docs/buyer-flow-design-contract.md`; treat “Scripted Buyer Path” as a legacy alias in older issues/docs.

- 2026-08-06 — Scope remaining June-review epics to Portfolio Demo depth
  - Reason: #101’s Pinia bugs were already fixed; #99/#103 were written as production hardening/SEO programs that conflict with `CONTEXT.md` (Mock Integration Boundary outside production auth/SEO ops).
  - Impact: closed #101; rewrote #99 as demo auth integrity (`requireMockAuth` seam) and closed #109/#111/#113 as `wontfix`; rewrote #103 around `usePageSeo` + public crawl hygiene; children promoted `ready-for-agent` at `priority:p2` so Next track `#426`–`#433` stays first.

- 2026-08-24 — Treat Components Marketplace as production-quality architecture delivered through a demo-safe environment

  - Reason: the portfolio should demonstrate production-minded web application design even when real traffic, live payments, and production infrastructure are intentionally absent.
  - Impact: mock/sandbox implementations remain valid for the demo, but business-critical boundaries, security, failure handling, state ownership, and replaceability should be evaluated against production-quality expectations. See `docs/system-design-review.md`.

- 2026-08-24 — Keep Nuxt/Nitro as a modular monolith for the current target production envelope

  - Reason: the current target (roughly thousands of products, low thousands of users/day, tens of concurrent users, and tens/low hundreds of orders/day) does not justify a separate backend service. Traffic growth alone is not a sufficient service-split driver.
  - Impact: prefer strengthening server-side modules and adding a production-grade relational database before creating a separate Node backend. Split services only when independent clients, deployments, teams, workloads, or domain boundaries justify it.

- 2026-08-24 — Server establishes authoritative e-commerce business truth

  - Reason: browser state is untrusted and may be stale or manipulated.
  - Impact: price, stock, checkout totals, order state, payment state, cart ownership, and authorization must be validated/established server-side. Checkout requests should communicate user intent rather than authoritative commercial totals.

- 2026-08-24 — Production checkout requires atomic inventory reservation, idempotency, and recoverable payment state

  - Reason: concurrent checkout, duplicate requests, provider timeouts, and partial failures can otherwise oversell inventory, double-charge customers, create duplicate orders, or lose recovery context.
  - Impact: target checkout creates durable `PENDING_PAYMENT` state, atomically reserves inventory, uses idempotency for payment/checkout attempts, treats ambiguous provider responses as unknown rather than failed, supports webhook/reconciliation recovery, and clears purchased cart state only after the purchase is safely committed. Detailed reasoning lives in `docs/system-design-review.md`.

- 2026-08-28 — Validate PR descriptions separately from application CI using current GitHub metadata

  - Reason: the former check ran at the end of `pnpm verify` against the immutable workflow-event snapshot, so PR descriptions completed after creation still appeared empty or incomplete and made otherwise-green application checks red.
  - Impact: `pnpm verify` covers repository behavior only; the trusted `PR template / check` workflow fetches the current PR body and reruns on description or label edits.

- 2026-09-01 — Use PostgreSQL as the single checkout persistence engine

  - Reason: carts, checkout claims, orders, inventory reservations, and payment state must survive separate Vercel invocations, and the accepted checkout guarantees rely on PostgreSQL transaction isolation, row locks, and uniqueness constraints.
  - Impact: local development, tests/CI, Vercel previews, and production use `DATABASE_URL` with explicit migrations. SQLite compatibility code and runtime schema creation are removed. PlaceOrder remains a synchronous application workflow over public domain APIs and does not add services, brokers, sagas, or `finalizePayment`.

- 2026-09-02 — Orders owns the sole persisted checkout read model; Catalog owns the complete payable quote

  - Reason: route-level fixture fallbacks and browser-side money calculations allowed order history, checkout, and confirmation to disagree or bypass customer scope.
  - Impact: demo orders are idempotently imported through Orders in mock mode, order detail/list reads are database-backed and customer-scoped, and Catalog allocates all final line and aggregate money in minor units before Orders persists the immutable snapshot. No `finalizePayment` behavior is added.

- 2026-09-08 — Prepare one durable local Payment before provider continuation

  - Reason: a retryable serializable transaction must not perform external
    payment I/O, because a provider success followed by transaction rollback can
    otherwise lose the local identity and create a second logical checkout on
    retry.
  - Impact: one atomic local preparation establishes the checkout claim,
    immutable Order, reservation, one `PENDING` Payment, and relational IDs;
    commit happens before any provider continuation. Replays recover the same
    `orderId`, `reservationId`, and `paymentId`. The local status model is
    `PENDING`/`PAID`/`FAILED`, with neutral `providerReference` and optional
    `PaymentNextAction` seams. Provider attempts, Stripe, webhooks, refunds,
    queues, outbox/cron recovery, and finalization remain deferred.

- 2026-09-12 — Finalize paid checkout before best-effort revision-aware Cart cleanup

  - Reason: payment and Order truth must survive a missing, changed, or temporarily
    unavailable Cart, and cleanup for revision `N` must never destroy intent added
    in revision `N+1`.
  - Impact: Inventory commit, Order confirmation, and the finalized checkout claim
    commit together before Cart cleanup runs in a separate PostgreSQL transaction.
    Cleanup compares the persisted checkout revision, treats every cleanup outcome
    as non-fatal after checkout success, and is retried by finalized replays. A
    revision mismatch preserves the complete newer cart; automatic line subtraction
    or merging remains deferred.
