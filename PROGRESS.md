# agent-Commerce Progress

## Current focus

- Issue #536 on `codex/536-reject-stale-cart-checkout`.
- Bind a checkout submission to the server-issued cart revision and quote fingerprint from the buyer's reviewed order.

## In progress

- The quote route returns a revision plus a deterministic payable-quote fingerprint;
  the browser submits both with the checkout intent, and `/api/orders/new` requires them.
- The application workflow rejects a mismatched revision or quote fingerprint before quote,
  reservation, Payment, or Order creation. The failure view calls this a cart
  change rather than a payment failure.
- Focused contract tests, lint, and typecheck pass. The new PostgreSQL race test
  is present but cannot run locally until a `DATABASE_URL` is configured.

## Blocked / known baseline failures

- Local PostgreSQL-backed verification and browser runtime proof for #536 are
  blocked: `.env` has mock public settings but no `DATABASE_URL`, and this host
  has no `psql`, `pg_isready`, Docker, or Podman runtime.
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

- With a PostgreSQL `DATABASE_URL`: run the focused checkout/cart suite, then
  `pnpm verify:full` and the stale-review browser flow before opening evaluator handoff.
