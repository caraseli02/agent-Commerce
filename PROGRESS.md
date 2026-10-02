# agent-Commerce Progress

## Current focus

- User-directed preparation for #583: existing payment state and public error contracts. Dedicated branch `codex/583-payment-state-error-contracts` starts at latest `origin/main` `19fcf7b4`, containing merged PR #589.
- Contract ownership, consumer inventory, fixed acceptance map, and verification selection live in `docs/agents/payment-contracts.md`; AGENTS.md routes future payment changes through it.

## In progress

- #583 only, assigned to caraseli02 with `in-progress`; #582 is closed and no other issue is claimed. Repository preparation is separate from application implementation. No #583 PR exists yet.
- Existing payment values/behavior are unchanged. Implement owner contracts, parsers, typed public errors, explicit UI mappings, and executable guard regressions in one coherent PR closing #583.

## Blocked / known baseline failures

- No unresolved #583 capability dependency: #582 merged through #589. Initial sandbox PostgreSQL DNS failure required the authorized network escalation; it is not an application test failure.
- Stripe activation stays off until #559. #585 still requires the deterministic commercial recovery policy; #587 depends on #586 and #588 on #585/#586/#587. These are outside #583.
- Previously recorded guest order-detail null-user `adminSettings` error remains outside this task.

## Verification baseline

- #589 exact-head fresh CI passed 94 files / 583 tests / 2 existing todo: https://github.com/caraseli02/agent-Commerce/actions/runs/37052355600. Merge is recorded as delivery evidence; no independent evaluator verdict is invented.
- Existing initialized checkout and locked dependencies reused; Node 24.21.0 / pnpm 10.18.3. `pnpm typecheck` passes on current main application sources. Focused preparation baseline passes 4 files / 71 tests (delivery evidence, visual selection, order payment state, and useOrder) through the isolated PostgreSQL wrapper.

## Next verification

- Validate preparation documentation formatting/state/clean checks. Application source has no changes, so browser/build/full coverage are not required for this preparation commit.
- During #583 implementation, run affected tests with the PostgreSQL wrapper and changed-file lint/typecheck; targeted failure-page desktop/mobile browser evidence follows actual UI changes. At final application delivery run one clean-tree `pnpm verify:handoff`; normal pre-push may reuse matching evidence, while CI stays fresh.

## Next work

- Implement all #583 acceptance rows on this branch, starting with compatibility fixtures and failing unknown-input/contract regressions. Proposed automated guards are not yet installed; current enforcement is documented review guidance plus existing typecheck/verification tooling.
- Keep WIP=1, close #583 with the complete contract cleanup PR, and obtain independent evaluation before review readiness. Do not grow #557/#558 or start unrelated payment behavior.
