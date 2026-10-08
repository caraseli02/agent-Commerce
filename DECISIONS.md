# DECISIONS

Use this file for durable cross-session decisions that should survive context resets.

## Cross-review acceptance — 2026-10-07

- Codex's structured evaluator verdict (`<!-- evaluator-head: <sha> -->` + `## Evaluator verdict`) on an `agent:claude` PR is the independent acceptance review for that PR, and Claude's verdict is the same for Codex's PRs. A Codex review of a Claude-built PR is not "advisory only" and does not need an additional non-OpenAI reviewer (Vlad, 2026-10-07, correcting an earlier instruction). A builder never reviews its own PR; Vlad merges after a PASS.
- A PR's builder is decided by provenance, not by label alone: the `agent:claude` label, a `claude/` head branch, a linked `agent:claude` issue, a "Generated with [Claude Code]" body or a `Co-Authored-By: Claude` commit trailer each mark it Claude-built, so Claude never reviews it and Codex does.
- Claude's routine runs from `~/Documents/agent-Commerce`, the checkout Codex also uses (Vlad, 2026-10-08): Codex works in the main checkout, Claude only in per-run worktrees; the routine's sandbox and guard hook therefore apply to every Claude session started there. Lock and journal live in `~/.local/share/agent-commerce/claude/`. The separate `~/GIT/agent-Commerce*` checkouts were removed.
- Claude's routine uses Vlad's existing gh login for now (Vlad, 2026-10-07); the repo-scoped token (#608 P1) is deferred and optional. The guard hook and the Bash sandbox stay required.

## Owner label and Claude run lock — 2026-10-06

- The GitHub label `lane:nightly` was renamed to `agent:claude`; it is the single Claude owner label and is set or removed only by Vlad. Agents never label an issue to take it. Codex's heartbeat was updated by Codex to skip `agent:claude`.
- Claude's WIP=1 is protected by a local run lock on the Mac mini, not by a GitHub branch: Claude's single hourly routine takes `/Users/work/.local/share/agent-commerce/claude/locks/claude-routine` through `.factory/bin/run-lock.sh` (atomic `mkdir`) before reading any state and holds it for the whole run. The lock is never taken over by age (Codex FAIL on #591 `17f2d631`): it is recovered only after its holder Claude Code process has stopped, under a second atomic guard, and a run releases only the lock whose owner token it holds. The two-routine design (`claude-generator` 3×/day plus `claude-evaluator` every 30 minutes) was replaced by one routine (repair → review → build), because Desktop skips runs while another scheduled task is running. The earlier `claude/wip-lock` compare-and-swap branch was rejected by the repo's pre-push hook, is not used and was never created. The claim record is the issue labels, assignee and comment plus the deterministic branch `claude/issue-<n>`, pushed normally. More than one Claude `in-progress` issue is reported through the blocker protocol; nothing is released by lowest number or by deleting a branch.

## Two-agent ownership and cross-review — 2026-10-04

- Claude and Codex work the backlog on the Mac mini only, during working windows, each with WIP=1. The issue label is the only claim record: `agent:claude` is Claude's, everything else `ready-for-agent` is Codex's. Unattended agents do not edit `feature_list.json` or `PROGRESS.md`.
- Builder and reviewer always differ: Claude reviews non-Claude PRs, Codex reviews `agent:claude` PRs. Verdicts are one structured comment per head with an `evaluator-head` marker; `INCONCLUSIVE` uses a separate retryable marker, and bot summaries never count. Vlad merges.
- Claude never builds payment, checkout or migration work. Claude routines live in `.factory/` and read it from `origin/main`; Codex follows `.factory/README.md` § Codex side, configured outside the repo.

## Builder ownership and reviewed tracking — 2026-10-05

- WIP=1 applies per builder; Codex skips `agent:claude`. Its internal Sol/Luna/Astra tasks share the same executable issue. Independent cross-review uses a separate evaluator session on the other builder's PR.
- Live claims belong to GitHub labels, assignments and linked PRs. Unattended agents leave shared tracking snapshots unchanged; explicit reviewed reconciliation preserves evidence in `PROGRESS.md` and `feature_list.json`. The snapshot validator does not enforce live GitHub WIP.
- The factory proposal #591 must adopt structured evaluator detection, retryable INCONCLUSIVE reports, serialized claiming and push-compatible conflict recovery before unattended rollout. This PR does not enable routines or change host schedules.

## External PR evaluation — 2026-10-04

- The controller plans/generates; an evaluator operated separately communicates through GitHub comments/reviews. The controller does not launch Astra evaluation or self-certify PASS.
- Verdicts must cover the current PR SHA, identify independent evaluation and supply the existing evidence/rubric. New commits invalidate old verdicts. FAIL repairs the same PR; PASS waits for human merge; ambiguous/BLOCKED reports require clarification.
- Machine setup is a local operational concern, not an executable product issue or a prerequisite documentation PR. Shared workflow proposals do not occupy implementation WIP unless explicitly claimed as a GitHub task.

## Payment contract ownership and regression policy — 2026-10-03

- Payment states belong to Payments; workflow/recovery decisions belong to checkout; public errors use a pure shared contract; presentation uses exhaustive mappings. Preserve persisted/wire values and legacy FAILED; Refund remains separate from historical PAID.
- Parse untrusted state fields, distinguish corruption from missing rows, and preserve conservative recovery. Return structured recovery outcomes across module boundaries.
- Require executable ownership, actual producer/consumer compatibility, and unknown-input regressions. Cover Vue label callers and real failure-page navigation; helper tests alone cannot certify consumer migration. Clear local failure context independently of remote cancellation.
- Durable rules live in `docs/agents/payment-contracts.md`; issue/session plans and model assignments belong in GitHub or the ignored verification record. Use one strongest delivery gate and matching pre-push evidence reuse.

## Bounded payment tasks and verification reuse — 2026-10-02

- #557/#558 are fixed tracking epics; native children #584–#588 own the remaining acceptance criteria. WIP=1 applies to an executable child, normally closed by one coherent PR. Evaluator PASS refers to the complete child, not an anonymous partial slice. New unrelated findings become separate backlog issues.
- #582 repairs the delivery workflow. Run one strongest local gate; pre-push may reuse a matching successful four-hour application receipt. Validators, affected runtime evidence, and visuals retain independent checks. CI cannot reuse receipts. Known documentation-only ranges run focused formatting/state checks; unknown or executable ranges run the full gate.
- #583 tracks existing state/error contract cleanup separately; no persisted payment values, provider activation, or payment behavior changes are part of this workflow repair.

## Stripe provider ADR — 2026-09-22

- Use Stripe Payment Intents + Payment Element behind the Payments module boundary; first scope is card-only including 3D Secure.
  - One logical Order maps to one durable local Payment and one reusable Stripe PaymentIntent.
  - Stripe SDK/card details stay inside Stripe/Payments; application workflows remain provider-neutral.
- Use target Payment states `PENDING / PROCESSING / PAID / CANCELED`.
  - PaymentIntent existence alone leaves the local Payment `PENDING`.
  - Recoverable declines return/remain `PENDING`.
  - `PAID` is monotonic.
  - Provider-initiated PaymentIntent cancellation terminalizes the existing checkout; explicit user re-review mints a new Cart revision and new checkout rather than replacing the intent on the old claim.
- Persist `stripe_payment_intent_create_started_at` before first provider creation and treat `NULL intent ID + non-NULL started_at` as unknown provider outcome.
  - Stripe v1 idempotency replay is bounded; retry the same create/key only within the conservative 24-hour window.
  - If the PaymentIntent ID is still unknown after that window, do not create automatically; mark checkout recovery-required and require operational/manual reconciliation.
  - Apply the same rule to Refund creation with a durable refund-create-start timestamp.
- Coordinate cancellation with PaymentIntent creation using durable `cancellation_requested_at`.
  - Local-only cancellation is safe only when provider creation never started.
  - Once cancellation is requested, `initiatePayment()` must not return a client secret if cancellation won its final conditional DB guard.
  - If payment success wins a later race, preserve `PAID` and compensate through paid-order recovery/refund when needed.
- Webhook deduplication covers the provider transition, not the entire request.
  - Event ID + Payment transition commit atomically.
  - For normal fulfillment, `payment_intent.succeeded` returns `2xx` only after critical Inventory/Order/claim finalization succeeds or is already complete.
  - For provider cancellation, `payment_intent.canceled` returns `2xx` only after a canceled Payment, Inventory release/expiry, and terminal `canceled` claim commit together. Duplicate delivery may retry that application consequence.
  - For a durable `REFUND` recovery decision, fulfillment is forbidden; Order becomes `ON_HOLD` and claim becomes `compensation_pending`.
  - The original payment-success webhook may acknowledge the REFUND branch only after a durable Stripe Refund ID exists (or the Refund already succeeded). Before that, duplicate delivery resumes the same compensation path.
  - Refund `FAILED` / unsafe-unknown states keep the Order `ON_HOLD` and claim in compensation recovery; they never fall back to fulfillment.
  - Best-effort revision-aware Cart cleanup is not part of the webhook acknowledgment gate.
- Late paid-order recovery uses one durable application-owned decision: `ALLOCATE / BACKORDER / REFUND`.
  - The decision is selected once under PostgreSQL coordination.
  - Once `REFUND` is committed, fulfillment/allocation cannot later win; once allocation/backorder is committed, refund cannot be selected.
- Refund remains a separate durable financial fact with `PENDING / SUCCEEDED / FAILED`; original Payment remains `PAID`.
  - First slice supports one full Refund per Payment only.
  - Refund webhook/reconciliation belongs to #558.
- Roll out payments with three separate gates: schema expansion -> Stripe activation -> schema contraction.
  - Phase A keeps old writers SQL-compatible: legacy `FAILED` remains temporarily valid and `use_existing_payment_method NOT NULL` gets `DEFAULT FALSE`.
  - Stripe activation stays OFF while any deployment sharing the database can still execute mock `continuePayment()/completePayment()` and fabricate `PAID`.
  - Before activation, enumerate and upgrade/retire/isolate every unsafe writer and pass a cross-version replay proving an old deployment cannot mutate a Stripe-backed Payment/Order to `PAID`.
  - Only later, after all old writers are gone/isolated, backfill `FAILED -> CANCELED`, tighten the status constraint, and drop legacy columns.
- Backend recovery precedes UI acceptance.
  - #554/#555 and #557 foundations are merged. Remaining capability order is #584 refresh/return; #585 application selection and #586 full Refund continuation; #586 -> #587 Refund settlement; #585/#586/#587 -> #588 webhook integration; #584/#588 -> #556 UI; then #559 activation. #557/#558 are tracking epics, not cyclic executable prerequisites.
  - `resumeOrderPayment` is an application workflow; Orders owns payability, Inventory owns reservation renewal, Payments owns provider truth.
- Keep provider-attempt tables, partial refunds, manual capture, app-owned saved cards, queues/brokers, and production real-money rollout out of the first slice.

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
