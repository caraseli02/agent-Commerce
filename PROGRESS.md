# agent-Commerce Progress

## Current focus

- PR #548 on `codex/535-checkout-qa-followups` combines the #536 stale-review guard with remaining #535 buyer QA repairs.
- Preserve server-issued review identity, buyer-visible checkout consistency, and account-data privacy.

## In progress

- The quote route returns a revision plus a deterministic payable-quote fingerprint; checkout requires both and rejects a stale review before an Order, Payment, or reservation is created.
- Credit payment remains visible with an actionable insufficient-balance/facility explanation; public tracking no longer renders static customer, address, or payment fixtures.
- Paid transaction history is derived from durable Orders, checkout drafts restore only within the session, and exact order IDs filter server-side.

## Blocked / known baseline failures

- Local PostgreSQL-backed verification and browser runtime proof remain blocked: `.env` has mock public settings but no `DATABASE_URL`, and this host has no PostgreSQL/Docker runtime.
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
- Vercel Preview buyer smoke passed on
  `agentcommerce-aiusnc84y-caraseli02s-projects.vercel.app`: the demo buyer
  completed order `ord-1789243391022-9181` (`ORD-248769`), the success and order
  confirmation views remained reachable, and reopening the cart showed it empty.
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

- Start mock Nuxt with a PostgreSQL `DATABASE_URL`, run the focused checkout/cart suite and `pnpm verify:full`, then exercise stale-review, guest draft, credit, tracking, transaction-history, ID-search, address, and sign-out browser flows.
