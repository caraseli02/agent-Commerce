# agent-Commerce Progress

## Current focus

- Issue #532 on `codex/532-revision-aware-cart-completion`.
- Keep paid Order/Payment finalization independent from revision-aware Cart cleanup.

## In progress

- Separated successful checkout finalization from best-effort cart completion so
  cleanup failures cannot turn a paid Order into a failed checkout.
- Finalized replays retry cleanup using the persisted cart ID and revision;
  preserve every newer cart revision without subtracting overlapping lines.
- PostgreSQL regressions cover cleanup rollback/retry, stale and repopulated carts,
  independent instances, duplicate requests, and concurrent checkout claims.

## Blocked / known baseline failures

- None for issue #532.
- Existing nonblocking warnings: `utils/categories.ts` legacy architecture warning,
  Vitest/coverage package version mismatch, and Vite native-config migration warning.
- Real provider I/O, webhooks, provider-attempt ownership, reconciliation, refunds,
  cancellation, and automated recovery remain deferred by this PR.

## Verification baseline

- Issue #532 focused PostgreSQL suite: 6 files, 40 tests passed; the final
  review-repair subset passed 2 files and 18 tests.
- `pnpm verify`: pass before the review repair; 77 files, 361 tests passed, 2 todo.
- Final `pnpm verify:full`: pass; 78 files, 364 tests passed, 2 todo; coverage 46.47%
  statements, 37.97% branches, 40.11% functions, and 47% lines.
- Architecture invariants and built-preview smoke for `/`, `/cart`, and
  `/checkout` passed.
- Initialization: exit 0, 75 files / 349 passed / 2 todo.
- Focused repair tests: exit 0, 7 files / 41 passed.
- `pnpm verify`: exit 0, 77 files / 359 passed / 2 todo.
- `pnpm verify:full`: exit 0, including architecture and preview smoke.
- Buyer/history/cart/result/hydration E2E: exit 0, 13 passed; new durable order
  readback asserts identity and unavailable fulfillment at 1440×900 and 390×844.
- Hydration reproduction: persisted-cart route sweep failed before and passed after
  the header fix (2 tests). Scanner negative fixture still fails as intended.
- Authenticated readback mismatch was traced to the company section appearing from
  persisted profile state before order load; it now waits for the order response.
  Development and final production browser regressions passed (5 final tests).
- Final hydration E2E: exit 0, 3 passed, including expired profile without a token.
- In-app purchase `ord-1789131043833-557` / `ORD-290867`: saved identity,
  mobile/desktop amounts, reload, and history confirmed; total 1150.39 RON.
- `pnpm verify:handoff`: exit 0 on clean snapshot `6b750105`, including 359 tests,
  architecture, smoke, and clean-state validation. The snapshot is a disposable verification copy; repairs are prepared for PR #529.
- Full session evidence is in the Codex session artifact `pr529-evidence` directory.

## Next verification

- Open the generator PR from reviewed commit `9dd6fe90` (or its documentation-only
  amendment).
- Vercel Preview buyer checkout smoke after deployment, then independent evaluator
  review and `pnpm verify:handoff` from the clean committed branch.
