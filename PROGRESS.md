# Components Marketplace Progress

## Current focus

- Production-harden the existing `PlaceOrder` vertical slice from
  `docs/system-design/place-order-production-hardening.md` before any
  `finalizePayment` work.
- Preserve the modular-monolith dependency direction: Nitro adapter → checkout
  application workflow → public Cart/Catalog/Inventory/Orders/Payments APIs.

## Implemented

- Replace process-local checkout state with one relational adapter: SQLite for
  local mock review and PostgreSQL through `DATABASE_URL`/`POSTGRES_URL` on
  Vercel.
- Make order create/read/list canonical, checkout claims database-enforced,
  cart completion revision-aware, and inventory/payment state durable.
- Reconcile authenticated customer pricing through the server Catalog quote;
  the demo STM32 price is `999.99 × 95% = 949.99 Lei` in the line, Payment
  Summary, PlaceOrder snapshot, success read, and history read.
- Fresh carts start empty. No `finalizePayment` implementation is included.

## Verification evidence so far

- Root causes in the hardening handoff were rechecked against `origin/main` and
  all six were present.
- `pnpm verify`: pass — build, lint, typecheck, 309 tests + 2 todo, coverage,
  feature-list validation, and UI conventions.
- `pnpm verify:full`: pass — includes architecture invariants and built-preview
  route smoke.
- Focused persistence suite: pass — restart replay, canonical read/list,
  duplicate request, same-cart-revision race, pricing, and empty cart.
- Built-preview API smoke: one add → quantity 1; server quote `949.99`; browser
  totals ignored; persisted shipping `19.90`; persisted total `1150.39`; retry
  returns the same order ID; read/history find it; cart clears.
- Playwright buyer-flow smoke: pass, including authenticated STM32 line and
  Payment Summary both showing `949.99 Lei`.
- Browser page/content/error-overlay/console checks: pass with no console
  errors.
- Independent correctness/specification and project-standards reviews: pass
  with no remaining findings.
- PR #523: https://github.com/caraseli02/Ecas/pull/523 — GitHub CI, PR-template,
  and Vercel deployment checks pass.

## Blocked

- The deployed-preview buyer smoke cannot run yet because the Vercel project
  has no `DATABASE_URL`/`POSTGRES_URL`. Authenticated CLI smoke reached the
  preview, and `/api/auth/login` failed closed with the expected
  `DATABASE_URL is required for durable checkout state on Vercel` runtime log.
- Creating or attaching a managed PostgreSQL database is an external resource
  change and requires user authorization. Keep this feature `active` until the
  database is attached and the 13-step preview buyer smoke passes.

## Next checkpoint

1. Attach a managed PostgreSQL database to the Vercel preview environment and
   redeploy PR #523.
2. Run the 13-step buyer smoke from the production-hardening handoff against
   the deployed preview.
3. Record the deployed evidence, mark `SD-PLACE-ORDER-HARDENING` passing, and
   run `pnpm verify:handoff` from the final clean tree.
