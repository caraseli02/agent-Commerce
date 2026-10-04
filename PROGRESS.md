# PROGRESS

## Current focus

- Issue [#592](https://github.com/caraseli02/agent-Commerce/issues/592), branch `codex/mac-mini-autonomy`: prepare the Mac mini to resume payments/system-design work with an external GitHub-comment evaluator. This is the sole active task.

## In progress

- Primary checkout and this worktree were synchronized to `origin/main` at `60310218`.
- Local PostgreSQL 17 starts at login; both checkouts use an ignored local demo database with mock provider and Stripe Gate A off. Repo-scoped shell configuration selects Node 24.11.0 and pnpm 10.18.3; Chromium is installed.
- Controller rules now consume independent exact-head evaluator comments/reviews. No evaluator model is launched here. An hourly Codex heartbeat resumes this chat and stays quiet while waiting.
- #583/#590 are merged and closed. The final independent evaluator PASS was 9/10 on `c5cd2084237ff96ca179f70c9acc5343e5ac3567`, superseding earlier process-failure reports. Machine-readable state is reconciled.
- After setup review and human merge, prefer eligible #584 (owner-scoped refresh/return). Recheck GitHub before claim; #586 remains later eligible work. Preserve modular-monolith public boundaries and WIP=1.

## Blocked / known baseline failures

- #585 needs the commercial recovery selection decision; #587/#588/#556/#559 retain their capability dependencies. Stripe activation remains off.
- PR #591 proposes a separately managed nightly lane; it is not merged and its routines are not installed by this setup. Avoid competing claims or schedules.
- Local heartbeat requires the Codex app to remain running in a logged-in user session. It is not an independent system daemon.

## Verification baseline

- Local PostgreSQL migration and Chromium installation pass. Initial `./init.sh` passed build/lint/typecheck and 97 files / 664 tests / 2 existing todo, but exposed Node 22 selection; corrected both zsh and bash login shells to Node 24.
- Corrected Node 24 initialization (`VERIFY_CMD='pnpm verify:full --fresh' ./init.sh`) passes build, bundle budgets, lint, typecheck, coverage (97 files / 664 passed / 2 existing todo), feature/UI/architecture checks and preview smoke `/`, `/cart`, `/checkout`. The known legacy category auth-header warning remains.
- Isolated `pnpm test:e2e tests/e2e/cart-order-summary.spec.ts` passes 3/3: guest purchase through sign-in/success, signed-in placement failure, and changed-cart re-review. Primary checkout dependencies and migrations also pass. Do not infer independent evaluator PASS from local verification.
- Environment and recovered-chat details: `docs/agents/mac-mini.md`. Next verification: clean pre-handoff validation, published-head CI and separate evaluator report; then wait for human merge.
