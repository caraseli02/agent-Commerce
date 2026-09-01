# Components Marketplace Progress

## Current focus

- Production-harden the existing `PlaceOrder` vertical slice from
  `docs/system-design/place-order-production-hardening.md` before any
  `finalizePayment` work.
- Preserve the modular-monolith dependency direction: Nitro adapter → checkout
  application workflow → public Cart/Catalog/Inventory/Orders/Payments APIs.

## In progress

- Use PostgreSQL through `DATABASE_URL` as the only checkout persistence
  engine in local development, tests/CI, Vercel preview, and production.
- Make order create/read/list canonical, checkout claims database-enforced,
  cart completion revision-aware, and inventory/payment state durable.
- Reconcile authenticated customer pricing through the server Catalog quote;
  the demo STM32 price is `999.99 × 95% = 949.99 Lei` in the line, Payment
  Summary, PlaceOrder snapshot, success read, and history read.
- Fresh carts start empty. No `finalizePayment` implementation is included.

## Verification baseline

- Root causes in the hardening handoff were rechecked against `origin/main` and
  all six were present.
- `pnpm db:migrate`: pass against the configured PostgreSQL development
  database, including the compatible legacy-schema migration path.
- Focused PostgreSQL migration/constraint and durable PlaceOrder suite: pass
  (9 tests), including concurrent migrators and `vi.resetModules()` replay,
  canonical read, and history list.
- `pnpm verify:handoff`: pass — build, lint, typecheck, PostgreSQL-backed
  coverage suite (314 passed + 2 todo), architecture invariants, built-preview
  route smoke, and clean-state validation.
- `pnpm test:e2e` now starts its own built Nitro server and cannot reuse a
  separately started server with the wrong database schema.
- No GitHub CI, Vercel deployment, evaluator, or deployed-preview evidence is
  claimed for the current unpushed commit.

## Blocked / known baseline failures

- The Vercel/Neon Preview configuration and all deployed-buyer evidence remain
  outstanding for this current commit. Before the deployed buyer smoke, enable
  Preview Branching/connect Preview in Vercel Storage, then deploy the PR so
  its build can run `pnpm db:migrate` against the preview branch.

## Next checkpoint

1. Enable Neon Preview Branching/connect Preview in Vercel Storage and deploy
   PR #523.
2. Run the 13-step buyer smoke from the production-hardening handoff against
   the deployed preview.
3. Record the deployed evidence, mark `SD-PLACE-ORDER-HARDENING` passing, and
   run `pnpm verify:handoff` from the final clean tree.
