# agent-Commerce Progress

## Current focus

- PR #529 findings repairs on `codex/pr529-findings`, based on
  `6db459f08567cc5e5c0ae85278ffbafcbd9b51ee` (remote head rechecked unchanged).
- Preserve the modular checkout preparation boundary and its deferred provider scope.

## In progress

- Implemented: atomic login merge retains guest cart revision history; authoritative
  checkout row money; immutable order name/code; truthful unavailable fulfillment;
  persisted-cart header, expired-session footer, and order-company-section hydration; architecture scan tooling exclusion.
- Added PostgreSQL rollback, failed continuation replay, guest reuse, concurrent
  merge, line-money allocation, identity, and durable-order browser regressions.
- Reviewed and updated only the two homepage snapshots inherited from PR #528.
- Visual (9 tests), manual browser checks, and clean snapshot handoff passed.
  Repairs are ready for the authorized push to PR #529; no merge performed.

## Blocked / known baseline failures

- Original PR QA found a blocking cart identity regression plus inherited display,
  hydration, architecture-scan, and homepage-snapshot findings. Repairs are now
  implemented; the original QA report remains preserved as historical evidence.
- Existing nonblocking warnings: `utils/categories.ts` legacy architecture warning,
  Vitest/coverage package version mismatch, and Vite native-config migration warning.
- Real provider I/O, webhooks, provider-attempt ownership, reconciliation, refunds,
  cancellation, and automated recovery remain deferred by this PR.

## Verification baseline

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

- Review the local repair diff; verification is complete.
- Human review of the local repair diff; PR #529 remains the sole active feature.
