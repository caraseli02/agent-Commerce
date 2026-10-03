# agent-Commerce Progress

## Current focus

- User-approved implementation of #583: existing payment state and public error contracts. Dedicated branch `codex/583-payment-state-error-contracts` starts at latest `origin/main` `19fcf7b4`, containing merged PR #589.
- Contract ownership, consumer inventory, fixed acceptance map, and verification selection live in `docs/agents/payment-contracts.md`; AGENTS.md routes future payment changes through it.
- Review correction: static coded HTTP response text now has a shared catalog and response factory; new/restart/resume routes select by code and the Stripe UI message reuses its owner. Existing response wording/statuses are preserved. The ownership guard now rejects inline static coded response messages.

## In progress

- #583 only, assigned to caraseli02 with `in-progress`; #582 is closed and no other issue is claimed. [PR #590](https://github.com/caraseli02/agent-Commerce/pull/590) delivers the contract cleanup and executable prevention checks from `codex/583-payment-state-error-contracts`. The public response copy correction requires updated verification and independent evaluation; the earlier exact-head PASS applies to `a3c5c8e6`, not this repair. Human merge remains required.
- Known persisted/wire values and financial behavior are preserved. Existing corrupt payment rows retain identity with a null parsed status; missing rows remain distinct. Unknown/corrupt state cannot authorize provider/fulfillment work or be rewritten to an executable workflow; UI unknown diagnostics use safe copy and no implicit cancellation. No schema or Stripe activation change. One coherent PR will close #583 after full criteria and independent review.

## Blocked / known baseline failures

- No unresolved #583 capability dependency: #582 merged through #589. Initial sandbox PostgreSQL DNS failure required the authorized network escalation; it is not an application test failure.
- Stripe activation stays off until #559. #585 still requires the deterministic commercial recovery policy; #587 depends on #586 and #588 on #585/#586/#587. These are outside #583.
- Previously recorded guest order-detail null-user `adminSettings` error remains outside this task.
- Existing `resolveCheckoutOutcome` fallback for an unknown provider result is unchanged; provider-result flow cleanup is outside the stored-state/public-error contract scope. Do not interpret #583 as a provider activation or complete transport validation audit.
- Additional transaction-label browser check could not render the Transaction History table at desktop/mobile, either by query or visible tab click. No dashboard repair is included. Numeric labels are unchanged and have explicit compatibility tests; failed supplemental browser evidence is reported in the PR for independent evaluation. The actual label consumer is the transaction table, not the orders tab.

## Verification baseline

- #589 exact-head fresh CI passed 94 files / 583 tests / 2 existing todo: https://github.com/caraseli02/agent-Commerce/actions/runs/37052355600. Merge is recorded as delivery evidence; no independent evaluator verdict is invented.
- Existing initialized checkout and locked dependencies reused; Node 24.21.0 / pnpm 10.18.3. `pnpm typecheck` passes on current main application sources. Focused preparation baseline passes 4 files / 71 tests (delivery evidence, visual selection, order payment state, and useOrder) through the isolated PostgreSQL wrapper.

## Next verification

- Focused compatibility evidence: 9 affected PostgreSQL suites / 168 tests pass; parser/presentation + ownership/corrupt guards passed 49 tests before review repairs. Repaired ownership/corrupt suites pass 18 tests, including actual PostgreSQL rejection of the locked-reread recovery predicate; repaired useOrder transport suite passes 9 tests. Typecheck and changed-file lint pass; final delivery checks cover the committed sources.
- Browser evidence: `/checkout/fail` cart/quote/unknown code cases pass on desktop 1280×800 and mobile 390×844 (6 tests); screenshots inspected for safe copy and usable actions. A seventh persisted unknown failure with `?id=unknown-order` navigates via the home link without any cancellation request. Built mock runtime uses an isolated PostgreSQL schema.
- One fresh clean-tree `pnpm verify:handoff --fresh` passed on runtime `ace748f3` / assessment head `19fe744e`: build, bundle budgets, lint, typecheck, 97 coverage files / 637 passing tests / 2 existing todo, state/UI/architecture validators, preview `/`, `/cart`, `/checkout`, and clean state. Subsequent evidence/assessment edits affect documentation only. Normal pre-push reused matching application evidence and passed the selected customer order-history visual test (1/1), with clean runtime assertions. Fresh CI and exact-head evaluation are recorded on PR #590.

## Next work

- Follow PR #590's exact-head fresh CI and independent evaluator verdict; keep WIP=1 while awaiting human review/merge. Executable parser/presentation, ownership and corrupt-state guards run in Vitest; compile-negative public-code fixtures run under typecheck. GPT-6.1 Sol owns implementation, Luna standards review and Astra correctness review/evaluation.
- Keep WIP=1, close #583 with the complete contract cleanup PR, and obtain independent evaluation before review readiness. Do not grow #557/#558 or start unrelated payment behavior.
