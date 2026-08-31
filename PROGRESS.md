# Components Marketplace Progress

## Current focus

- Production-harden the existing `PlaceOrder` vertical slice from
  `docs/system-design/place-order-production-hardening.md` before any
  `finalizePayment` work.
- Preserve the modular-monolith dependency direction: Nitro adapter → checkout
  application workflow → public Cart/Catalog/Inventory/Orders/Payments APIs.

## In progress

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
- `pnpm verify`: pass — build, lint, typecheck, 304 tests + 2 todo, coverage,
  feature-list validation, and UI conventions.
- Focused persistence suite: pass — restart replay, canonical read/list,
  duplicate request, same-cart-revision race, pricing, and empty cart.
- Built-preview API smoke: one add → quantity 1; server quote `949.99`; browser
  totals ignored; persisted shipping `19.90`; persisted total `1150.39`; retry
  returns the same order ID; read/history find it; cart clears.
- Playwright buyer-flow smoke: pass, including authenticated STM32 line and
  Payment Summary both showing `949.99 Lei`.
- Browser page/content/error-overlay/console checks: pass with no console
  errors.

## Next checkpoint

1. Run `pnpm verify:full`.
2. Review the complete diff against the handoff and architecture standards.
3. Commit, open a focused PR, wait for CI/Vercel preview, and repeat the buyer
   smoke against the deployed preview.
4. Run `pnpm verify:handoff` from the final clean tree.
