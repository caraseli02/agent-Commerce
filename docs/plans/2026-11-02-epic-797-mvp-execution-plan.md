# Epic #797 execution plan — checked against `main` @ `48f1add` (2026-11-02)

**Status:** planning document. Nothing here grants implementation, label, claim, provider-write, shared-database or deployment authorization. GitHub issue labels, assignments and linked PRs stay the only live task state; this file is the reviewed step list that those issues point to.

**Inputs checked:** the #797 body and its four comments, all 16 native sub-issues (#805, #828, #841–#846, #881–#888), open PRs (#889 for #842), the #828 investigation report, and the source on `main` at `48f1add`. Every claim below cites the file it was checked against.

## 1. Summary

- **The direction holds.** A1 inventory, Stripe test mode, Spain/EUR, manual fulfillment first, EasyPost test mode later. #804 and #841 are fixed; #842 is in review (PR #889).
- **The children miss nine things the code shows** (§3). Four would break the MVP if built as written:
  1. #882 does not cover the hard-coded RON in refunds. EUR orders could be charged but not refunded.
  2. #887 would break the customer checkout-failure page.
  3. #844 has no operator identity to reuse.
  4. #883 does not make the delivery address an input to the quote.
- **Ten owner decisions are open** (§4). Each has a recommendation.
- **Three children are missing** (§5): demo data off the critical path, the deployed acceptance run, and a home for workstream D.
- **The builder lanes are unbalanced:** about 15 PRs for Codex and 4 for Claude. §6 proposes a rebalance; the owner decides.
- **§7 breaks every open child into atomic steps.** Each step is one reviewable commit that leaves `main` green.

## 2. Live state of the children (2026-11-02)

| Issue | Scope                                 | Labels / owner                      | Depends on       | Actual state                                                                 |
| ----- | ------------------------------------- | ----------------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| #828  | A1/A2 investigation                   | closed                              | —                | Report delivered; A1 approved                                                |
| #841  | Canonical identity + bootstrap        | closed                              | —                | Merged (`server/domain/inventory/bootstrap.mjs`, `pnpm inventory:bootstrap`) |
| #842  | PDP/cart authoritative stock          | `agent:claude`, in-progress         | #841             | **PR #889 open**, head `8b0458c`, waiting for Codex review                   |
| #843  | Listing availability                  | `ready-for-agent` (Codex)           | #842             | Blocked on #842 merge                                                        |
| #844  | Operator auth + read-only stock view  | `agent:claude`, p1                  | #842, #841, #635 | Blocked on #842 merge                                                        |
| #845  | Audited receipts/adjustments          | `ready-for-agent` (Codex)           | #842, #844       | Blocked                                                                      |
| #846  | Two-process A1 proof                  | `ready-for-agent` (Codex)           | #843, #845       | Blocked                                                                      |
| #881  | In-stock only, no new backorders      | `ready-for-agent`, p2               | #842             | Blocked on #842 merge                                                        |
| #882  | EUR, VAT, totals                      | `ready-for-agent`, p1, payments     | —                | **Unblocked now**                                                            |
| #883  | Spain zones + shipping fees           | `ready-for-agent`, p1, payments     | #882             | Blocked                                                                      |
| #884  | Manual fulfillment lifecycle          | `ready-for-agent`, p2, payments     | #844             | Blocked                                                                      |
| #885  | EasyPost Spain feasibility (research) | `ready-for-agent`, p1               | —                | **Unblocked now**                                                            |
| #886  | EasyPost integration                  | `ready-for-human`, p2               | #882–#885, #844  | Split after #885                                                             |
| #887  | Durable cancel + payment recovery     | `agent:claude`, p2, payments        | #844             | Blocked                                                                      |
| #888  | Outbox notifications                  | `ready-for-agent`, p2               | #884             | Blocked                                                                      |
| #805  | Admin order actions                   | `agent:claude`, `blocked`, payments | #844, #884, #887 | Blocked                                                                      |

## 3. Claims checked against the code

### 3.1 Claims that hold or were fixed

| Claim (epic / review on #797)                  | Verdict on `48f1add`                                                                                                                                                                          | Evidence                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anyone can become admin on a public deployment | **Holds** while `NUXT_PUBLIC_MOCK_MODE=true` (Preview and main)                                                                                                                               | Login modal ships `admin123` (`app/components/layout/account-modal/Form.vue:138-146`). Unsigned `demo-token::<id>::<ms>` is accepted in mock mode (`server/utils/mockUsers.ts:180,236-239`) and grants `isAdmin` (`server/utils/requireRequester.ts:14`) |
| #635 gives durable identity                    | **Partly.** Signed HS256 customer tokens and `customer_accounts`, but the role is fixed to `customer`                                                                                         | `server/utils/accountSession.ts` (`role: 'customer'`, verification rejects other roles); `server/infrastructure/migrations/012_customer_accounts.sql`. **No operator principal or grant exists**                                                         |
| Abandoned holds never released (#804)          | **Fixed** by crediting expired `active` holds at read time (no sweeper)                                                                                                                       | `server/domain/inventory/index.ts` `availableQuantity`; PR #889 adds the same rule in SQL (`readAvailability`)                                                                                                                                           |
| Stock rows seeded lazily from fixtures         | **Fixed** by #841: explicit bootstrap only; nonnegative counters                                                                                                                              | `server/domain/inventory/bootstrap.mjs`; `migrations/011_inventory_counters.sql`                                                                                                                                                                         |
| Products API and cart use fixture stock        | **Main: holds.** PR #889 fixes PDP and cart; listings stay on fixtures until #843                                                                                                             | `app/components/product/Quantity.vue`, `server/utils/mockCart.ts`                                                                                                                                                                                        |
| Admin Cancel is a silent no-op                 | **Holds**                                                                                                                                                                                     | `server/api/orders/[id]/cancel.post.ts:7` → process-local map in `server/utils/mockRuntimeOrders.ts`                                                                                                                                                     |
| Order status lives in `payload_json`           | **Holds.** Payment confirmation already rewrites the blob, so "immutable snapshot" can only mean the commercial fields                                                                        | `server/domain/orders/index.ts:230-260, 352-375`                                                                                                                                                                                                         |
| No stock movement ledger                       | **Holds.** Sales decrement `on_hand` without a record; #845 audits operator adjustments only                                                                                                  | `server/domain/inventory/index.ts:283-288`                                                                                                                                                                                                               |
| No outbox; guest orders copy the demo email    | **Holds, with a nuance.** No outbox code. Guest checkout does collect an email, but only inside the unvalidated `shippingDetails`; the order's `user` block still carries `customer@demo.com` | `server/utils/mockUsers.ts` (`createMockGuestCheckoutUser`); `app/composables/useOrder.ts:205-211`                                                                                                                                                       |
| VAT 19% added on top of merchandise only       | **Holds.** Prices are VAT-exclusive today                                                                                                                                                     | `server/domain/catalog/index.ts:140-157`; `helpers/order-money.ts:31`                                                                                                                                                                                    |
| Two shipping price sources                     | **Holds.** The dead route `checkout/validate` is still referenced by cache-policy tests                                                                                                       | `server/domain/catalog/index.ts:49-52`; `server/api/checkout/{submit,validate}.post.ts`; `tests/api-cache-policy.spec.ts:58`                                                                                                                             |
| Stripe test mode is the payment truth          | **Holds.** Test mode is on for Preview and main (#559 closed); the server accepts card only                                                                                                   | `docs/agents/payments/stripe-test-mode-operations.md`; `server/application/checkout/place-order.ts:234`                                                                                                                                                  |

### 3.2 New findings the children don't cover

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                            | Evidence                                                                                                                                                                                                                                                         | Affects                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| F1  | **RON is enforced in the schema and in the payment code, not only in the UI.** `checkout_refunds.currency` has `CHECK (currency = 'RON')`. The refund adapter and the payment-state reader reject anything else. Catalog, Orders and Payments use a `'RON'` literal type. The UI calls `formatLei` 19 times across 11 files, and the currency store defaults to `Lei`. An EUR order could be paid but never refunded or recovered. | `migrations/007_full_refunds.sql:6`; `server/domain/payments/stripe-refunds.ts:64,77,169`; `server/application/checkout/read-order-payment-state.ts:51`; `server/domain/orders/index.ts:303`; `helpers/money-format.ts`; `app/store/regionalPreferencesStore.ts` | #882                              |
| F2  | **The owner's VAT decision inverts the arithmetic.** Today VAT is added on top. The decision is VAT-inclusive 21%, so VAT is extracted from the gross price. The small-order charge (4.99 below 50, no VAT) has no EUR decision.                                                                                                                                                                                                   | `server/domain/catalog/index.ts:54,97,140`                                                                                                                                                                                                                       | #882                              |
| F3  | **The address is not a quote input.** `shippingDetails` passes from the request body straight into the Order snapshot. `validate-address` only checks that fields are present. The quote and the review fingerprint don't include the destination, so zone-based fees can't be tied to what the buyer reviewed.                                                                                                                    | `server/application/checkout/place-order.ts:306-312`; `server/api/orders/validate-address.post.ts`; `server/api/orders/price.post.ts`; `server/application/checkout/review-fingerprint.ts`                                                                       | #883                              |
| F4  | **The customer checkout-failure page calls the same cancel route** on leave. #887 makes that route operator-only, which would break buyer checkout cleanup. That cleanup is a payment-contract-guarded behavior.                                                                                                                                                                                                                   | `app/pages/checkout/fail/index.vue:72-99`; `docs/agents/payment-contracts.md`                                                                                                                                                                                    | #887, #805                        |
| F5  | **#844's read-only view needs on-hand and held.** PR #889's contract returns only `available`. The expired-hold rule now exists twice: JS in `availableQuantity` and SQL in `readAvailability`.                                                                                                                                                                                                                                    | PR #889 `server/domain/inventory/index.ts`                                                                                                                                                                                                                       | #842 review, #844                 |
| F6  | **`payload.fulfillment` is already taken.** Paid recovery uses it for reservation buckets. Demo seed orders have `paid_by_payment_id = NULL` but can show paid-looking statuses. Admin tabs and KPIs read the payload status. KPIs sum `grand_total` across currencies.                                                                                                                                                            | `server/domain/orders/index.ts:100-138, 368`; `server/api/dashboard/orders/admin/[type].get.ts`                                                                                                                                                                  | #884, #882                        |
| F7  | **There is no scheduler.** `vercel.json` has no crons and there are no Nitro tasks. An outbox dispatcher or a webhook reconciler has nothing to run it.                                                                                                                                                                                                                                                                            | `vercel.json`; `server/plugins/`                                                                                                                                                                                                                                 | #888, #886                        |
| F8  | **Every Vercel build runs migrations** against its environment's database. A PR's Preview migrates shared Neon `vercel-dev`; main migrates `production`. Each new table or constraint must be safe for the code already deployed on the same database.                                                                                                                                                                             | `vercel.json` `buildCommand: pnpm db:migrate && pnpm build`                                                                                                                                                                                                      | Every child that adds a migration |
| F9  | **Deployed stock depends on a manual bootstrap.** After #841, only `pnpm inventory:bootstrap --apply` creates stock rows, and no build step runs it. Nothing records that `vercel-dev` or `production` were bootstrapped. If they weren't, #889 shows "Stock unavailable" and blocks immediate Add for those products, and checkout already fails for them.                                                                        | `README.md:60-72,155-158`; `scripts/inventory-bootstrap.mjs`                                                                                                                                                                                                     | #842 merge, acceptance            |

**Smaller watch items:**

- `orders.findById` loads every order and scans them in JS (`server/domain/orders/index.ts:415-441`).
- The address book is a process-local Map (`server/utils/mockRuntimeAddresses.ts:11`).
- `DECISIONS.md:74` ("Claude never builds payment, checkout or migration work") is stale; the 2026-10-20 owner decision in `docs/agents/payment-contracts.md` and `docs/agents/autonomous-workflow.md` superseded it. #844 and #887 both need migrations, so the owner should fix this protected file.

## 4. Owner decisions needed before the affected child starts

| ID  | Question                                        | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Blocks                        |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| D1  | Who may cancel an unpaid order?                 | One domain operation. The **order owner** may cancel their own unpaid order (this keeps the checkout-failure cleanup working). A **trusted operator** may cancel any unpaid order. Change #887's "Only trusted operator sessions can cancel" to match.                                                                                                                                                                                                                                                                                                                                               | #887                          |
| D2  | What is an operator?                            | A registered `customer_accounts` user with a row in a new `operator_grants` table (account ID, permission, granted by, granted at). The grant is checked in the database on **every** operator request, so revoking takes effect on the next request. Grants come from a dry-run-by-default CLI that the owner runs on deployed environments. Demo "Admin Preview" stays read-only sample data and never passes the operator guard. Tokens travel as a bearer header, not an ambient cookie, so CSRF doesn't apply; record the XSS exposure of the JS-readable `token` cookie as a known limitation. | #844 → #845, #884, #887, #805 |
| D3  | Small-order charge in EUR                       | Drop it for the MVP: the approved EUR money rules list no such fee. If it stays: €4.99 below €50, VAT-inclusive, with VAT extracted like shipping.                                                                                                                                                                                                                                                                                                                                                                                                                                                   | #882                          |
| D4  | Demo data on the critical path                  | Keep the demo catalog and demo login. Mock-mode seed orders (`demo-seed:*`, no payment link) are **never** fulfillable or cancellable through operator actions. They are excluded from operator queues and KPIs, or seeding stops on the acceptance environment. Rewrite the exit criterion to: "no mock business data in any operator or buyer decision on the critical path".                                                                                                                                                                                                                      | #884, #805, acceptance        |
| D5  | Stock ledger scope                              | #845 creates `inventory_movements` with `receipt` and `correction` rows. A small follow-up child adds `sale` and `release` rows from commit/release, so the question "why is stock 7?" has a complete answer. Or accept audit of operator changes only and record that limit.                                                                                                                                                                                                                                                                                                                        | #845, #846                    |
| D6  | Workstream D (real-store readiness)             | Move it into a new live-money epic. While it sits in #797 as unchecked boxes, #797 can never close.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | #797 closure                  |
| D7  | Deployed acceptance                             | A final, owner-authorized child runs the eight-step scenario on an isolated product or isolated database. #846 is explicitly local-only.                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #797 closure                  |
| D8  | Address book                                    | Out of the MVP critical path. Checkout snapshots the submitted, server-validated address (#883). The process-local address book is documented as a demo convenience.                                                                                                                                                                                                                                                                                                                                                                                                                                 | #883                          |
| D9  | What runs the outbox and reconcilers on Vercel? | Best-effort dispatch right after the commit, plus an internal sweep route protected by a secret and triggered by Vercel Cron (owner configures the secret and the cron), plus a manual "retry" on the operator view.                                                                                                                                                                                                                                                                                                                                                                                 | #888, #886                    |
| D10 | Currency display                                | Make the formatter currency-aware. New storefront prices and quotes show EUR; historic orders render in their own snapshot currency. Fix the regional currency selector to EUR (or remove it) for this milestone.                                                                                                                                                                                                                                                                                                                                                                                    | #882                          |

**Owner checks (read-only, owner-run):**

- **O1.** Run `pnpm inventory:bootstrap` (dry-run) against Neon `vercel-dev` and `production`. Apply only if rows are missing. Do this **before merging #889** (F9).
- **O2.** Fix `DECISIONS.md:74` (protected path).

## 5. Missing children to open

- **N1 — Keep demo seed orders off operator actions and KPIs** (D4). Small. Must land before #884's API is reachable from the admin UI.
- **N2 — Deployed MVP acceptance run** (D7). Owner-authorized. Steps 1–8 of the epic scenario plus the failure checks, on an isolated product or isolated Neon branch. Includes Stripe test webhooks and the cache behavior. Closes #797.
- **N3 — Live-money readiness epic** (D6). Takes over workstream D.
- **N4 (optional, D5)** — Record `sale` and `release` stock movements.

**Epic body edits:**

- Link the workstream A bullets to #842–#846.
- Replace the stale "paid → preparing → shipped" bullet with the approved Processing → Packaging → Dispatched → Delivered lifecycle.
- Point C's "Validate address handling" at #883 and #888.
- Move D out.
- Rewrite the mock-data exit criterion (D4).
- Add N1/N2.

## 6. Dependency graph and builder lanes

```text
             ┌─> #843 (listings) ─────────────────────────┐
#841 ✓ ─> #842 (PR #889) ─┬─> #881 (in-stock only)         ├─> #846 (2-process proof) ─┐
                          └─> #844 (operator auth) ─┬─> #845 (receipts) ──────────────┘  │
                                                    ├─> #887 (cancel) ──┐                │
                                                    └─> #884 (fulfil) ──┼─> #805 (admin) ├─> N2 acceptance
                                                         │  └─> #888 (outbox)            │
#882 (EUR/VAT) ─> #883 (zones) ──────────────────────────┴─> #886.a–d (EasyPost) <─ #885 ┘
N1 (demo seeds) ─> before #884's admin wiring and #805
```

**Overlap hazards** (shared files, so serialize them or keep them in separate modules):

- #882, #883 and #881 all edit the Catalog quote, `place-order` and the order-summary UI. Keep them in one lane, in that order.
- #884 and #887 both touch Orders and add migrations, and they are planned for different builders. Put fulfillment in its **own module** (`server/domain/fulfillment/`) that reads Orders through its public API. #887 stays in `server/application/checkout/`. Assign migration numbers at rebase time.

**Lanes:** each builder has WIP=1, the other builder reviews, and the owner merges. Rebalancing is the owner's call.

| Lane   | Current queue                                                  | Recommended queue                                                        |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Claude | #842 → #844 → #887 → #805                                      | #842 → #844 → #845 → #887 → #805                                         |
| Codex  | #885, #882, #883, #881, #843, #845, #884, #888, #846, #886.a–d | #885 → #882 (3 PRs) → #883 → #884 → #881 → #843 → #888 → #846 → #886.a–d |

Moving #845 to Claude keeps the operator write surface with the builder that built its guard (#844).

## 7. Atomic steps per child

**Rules for every step:**

- **One step = one commit** that builds, typechecks and passes its focused tests on its own. **One child = one PR**, unless a split is listed.
- **Migrations are expand-only** (F8): new tables or nullable/defaulted columns only, and no constraint the currently deployed `main` would violate. Never drop or rename in the same PR. One migration per PR, numbered at rebase.
- **No process-local authoritative state.** No fixture fallback on reads. No change to frozen commercial fields in `payload_json`.
- **Payment paths** (`server/application/checkout/**`, `server/domain/payments/**`, checkout UI) follow `docs/agents/payment-contracts.md` and run `tests/payment-contract-ownership.spec.ts`.
- **Protected paths** (`scripts/**`, `docs/agents/**`, `DECISIONS.md`, …) in a PR need the action line `Add owner-approved-harness to PR #N`. New CLIs go in `scripts/`, so this applies to #844 and, if it changes the test wrapper, #846.
- **Gates:** focused checks while building. At delivery: `pnpm verify:full` (anything touching checkout, payments or the API boundary), then `pnpm verify:handoff`. Browser evidence at desktop and mobile follows `.agents/skills/verify-ui-change/SKILL.md`.

### #842 — PDP/cart availability (PR #889, in review)

1. **Codex evaluates head `8b0458c`.** Check:
   - (a) A parity test proving `readAvailability` and reservation admission agree on the same fixtures (live hold, expired-but-`active` hold, restock above the fixture).
   - (b) The order-summary copy when a cart's intended quantity is above current availability (reads no longer clamp).
   - (c) Unknown or uninitialized products are blocked consistently: 0 immediate in the cart, "Stock unavailable" on the PDP.
2. **Repair on the same PR** if (a) is missing.
3. **Owner runs O1, then merges.**

### #885 — EasyPost Spain feasibility (research only; deliverable is one issue comment)

1. Collect the official EasyPost sections: MRW and CTT Express Spain guides, getting started, authentication, webhooks, test-mode trackers. Record URL and section for every claim.
2. Classify what can be proven at four levels: test Tracker, carrier-backed sandbox label, simulated rate, live postage.
3. Define fixtures: one parcel, the Madrid demo origin, and mainland and Balearic destinations. No real data.
4. List the owner actions: accounts, carrier test credentials, rate cards, webhook secret, environment variable names.
5. Verdict: go, no-go or go-with-fallback. Propose names and scope for #886.a–d.

### #882 — EUR, VAT and totals (split into 3 PRs; the order matters, so each merge leaves the store consistent)

**PR 882-1: currency foundation, still charging RON** (payments path)

1. Add one owned `Currency = 'RON' | 'EUR'` type in the payments/orders contracts. Replace the `'RON'` literal types in `server/domain/{catalog,orders,payments}/**` and `types/order-summary/shipping-services.ts`. Behavior unchanged.
2. Migration: relax `checkout_refunds.currency` to `IN ('RON','EUR')` (expand-only).
3. Refund adapter and payment-state reader: replace the RON-only checks with "payment currency = order currency = refund currency, and the currency is supported". Tests: an EUR refund succeeds; historic RON refunds and payment state read back unchanged.

**PR 882-2: currency-aware display, still RON** 4. Add a `formatMoney(amount, currency)` helper. Migrate the 19 `formatLei` calls to take the currency from the product, quote or order. Keep `formatLei` as a RON alias only where a historic snapshot is rendered. 5. Fix the regional currency store to the storefront currency (D10). Group or filter the admin KPIs by currency instead of summing across currencies. 6. Visual check: pixel-identical while the store is still RON.

**PR 882-3: switch new quotes to EUR, VAT-inclusive 21%** (payments path) 7. Add explicit per-category tax config in Catalog (every current category maps to 0.21). An unknown category fails the quote closed. 8. VAT-inclusive arithmetic in integer cents. Per line: `vat = gross − round_half_up(gross / 1.21)`; order VAT = sum of line VAT. Extract shipping VAT separately. Write the rule in a code comment and in `docs/system-design/`. Add rounding boundary tests. 9. New quotes use EUR and reuse the current numeric prices (no FX). Small-order charge per D3. The quote and the snapshot carry `currency`, `pricesIncludeVat`, per-line `vatRate`, `vatTotal`. The review fingerprint covers the currency. 10. `place-order` rejects mixed currency, stale revision or a stale fingerprint before payment preparation. PaymentIntent `amount` = Order `grandTotalMinor`, currency `eur`. Test the agreement per sample. 11. JSON-LD `priceCurrency` comes from Catalog. Browser evidence: PDP, cart, summary, confirmation and admin order (mainland).

### #883 — Spain zones and shipping (after #882)

1. Server config: the Madrid demo warehouse (marked as demo data) and a pure `resolveDeliveryZone({country, postcode})`: mainland, Balearics (`07xxx`), or rejected (`35`, `38`, `51`, `52`, non-`ES`, malformed postcode). Table tests.
2. Zone shipping options (EUR, VAT-inclusive): mainland €4.95/€9.95, Balearics €9.95/€14.95, each with its delivery promise. They replace `catalog.deliveryOptions`. Delete the dead `checkout/submit` and `checkout/validate` routes and their entries in the cache-policy tests.
3. The destination becomes a quote input: `quoteCheckout({ destination })` via `price.post.ts` and `place-order`. The fingerprint covers the zone and the option.
4. `place-order` validates the submitted address with zod and the zone resolver, and rejects unsupported destinations **before** reservation or payment. It snapshots the normalized address instead of passing the raw `shippingDetails` through.
5. `validate-address` returns the zone, or the exact copy "We currently ship to mainland Spain and the Balearic Islands only". The address step shows that copy before any quote.
6. Order summary: options per zone; a changed address triggers a re-quote. Historic orders keep rendering their snapshot options.
7. Tests and browser evidence: mainland, Balearics, unsupported postcode, stale address.

### #844 — Operator principal and read-only stock view (Claude; needs D2)

1. **Inventory contract:** add `readStockLevels(ids)` returning `{onHand, effectiveHeld, available}` from the **same** statement as `readAvailability`: one query, two projections, no copied SQL. Parity test.
2. **Migration:** `operator_grants(account_id → customer_accounts.id, permission CHECK IN ('inventory:read','inventory:write','orders:fulfil','orders:cancel'), granted_by, granted_at)`, with primary key (account, permission).
3. **Guard:** `requireOperator(event, permission)`. Verify the signed customer token, then look up the grant in the database on every call. 401 without a valid token, 403 without the grant. Demo tokens never pass, even in mock mode. Tests: anonymous; customer; forged `demo-token::mock-admin-1`; modified JWT; revoked grant takes effect on the next request; body or header role claims ignored.
4. **Provisioning CLI:** `pnpm operator:grant` / `operator:revoke`, dry-run by default, in `scripts/` (protected path, needs the owner action line). No HTTP grant endpoint.
5. **API:** `GET /api/operator/me` and `GET /api/operator/inventory` (no-store, batched over the canonical catalog IDs).
6. **UI:** a minimal `/dashboard/operator/inventory` table (ID/SKU, name, on hand, held, available) with loading, error and retry states. Operator navigation appears only when `/api/operator/me` allows it; the server stays the authority.
7. **Docs:** record the guard contract (bearer header, so no CSRF; revocation semantics; the XSS limitation) in `docs/system-design/`.
8. **Evidence:** HTTP authorization matrix, two-instance check (stateless token plus database grant), and browser evidence.

### #845 — Audited receipts and corrections (needs #844; D5)

1. **Migration:** append-only `inventory_movements`:
   - Columns: `id`, `product_id`, `kind`, `delta`, `reason`, `actor_id`, `idempotency_key UNIQUE`, `request_fingerprint`, `on_hand_before`, `on_hand_after`, `created_at`.
   - `kind`: `receipt` and `correction` now; `sale` and `release` reserved for N4.
2. **Inventory `adjustStock`:** runs in the shared serializable transaction with a row lock.
   - A positive delta is a receipt; a negative delta is a correction.
   - Same key with the same payload replays the original outcome. Same key with a different payload conflicts.
   - Reject a result below 0 or below the effective **unexpired** holds (reuse the step 1 computation from #844).
3. **Route:** `POST /api/operator/inventory/adjustments` with `requireOperator('inventory:write')`. Zod bounds: safe nonzero integer, reason 3–200 characters, key format.
4. **UI:** receipt and correction form on the operator view. The client creates one idempotency key per submit attempt and reuses it on retry.
5. **Tests:**
   - An unauthorized request has no effect and leaves no row.
   - Concurrent requests with the same key apply once; a lost response replays.
   - Races against reserve, commit and expiry stay consistent.
   - A decrease below held stock is rejected.
   - A buyer sees a restock above the fixture cap.
6. **Browser evidence:** receipt, correction, a conflict, and the buyer-side refresh.

### #881 — In-stock only (needs #842; run after #883 in the Codex lane)

1. Inventory policy for **new** reservations: reject `backorderQuantity > 0`. Historic reservation rows stay parseable.
2. The cart clamps an over-quantity line to what is available and returns a notice. The UI shows it. Lines are never dropped silently. PDP and cart limits equal availability; at zero there is no Add.
3. Stop offering `back-001` and `backorderShippingTypes` in new quotes and in `general-settings`. Keep the definition so historic orders render.
4. A checkout `inventory_unavailable` returns the refreshed, clamped cart review with the notice.
5. Regression: a late payment on a **new** order with no stock left goes to REFUND compensation, never BACKORDER (its frozen choice is never `back-001`).
6. Tests:
   - 0 stock.
   - 5 requested vs 3 available.
   - Two buyers racing for the last unit.
   - A stale listing.
   - A retry after a timeout.
   - A restock.
   - Expired holds.
   - Historic backorder orders read back unchanged.

   Browser evidence on the PDP and cart at 0 and low stock.

### #887 — Durable cancel and payment recovery (Claude; needs #844 and D1)

1. Read and record the existing machinery before designing: `cancellation_requested_at` on payments, `terminalize-canceled-checkout`, `restart-canceled-checkout`, PaymentIntent cancel in `stripe-intents.ts`, and the failure-page policy.
2. **Migration** (only if the existing columns can't hold it): `order_cancellations(order_id PK, actor_id, actor_kind, idempotency_key UNIQUE, request_fingerprint, requested_at, outcome, completed_at)`.
3. **Workflow `cancelUnpaidOrder`:**
   - Lock the Order and Payment. If already paid, return `paid` and change nothing.
   - Mark the cancellation requested, then call the provider **outside** the transaction.
   - On a confirmed cancel, terminalize through the existing path; the reservation is released exactly once.
   - On an unknown outcome, persist the intent and return `pending`. Refresh or a webhook reconciles it.
4. **Route:** `POST /api/orders/:id/cancel` moves off `runtimeOrders` onto the workflow. Owner-of-own-unpaid or operator (`orders:cancel`); idempotency key from the client.
5. **Race tests** with a Stripe fake:
   - Payment succeeded before the cancel.
   - Timeout after the provider cancelled.
   - Two operators cancelling at once.
   - A late `payment_intent.succeeded` after a local cancel, handled through the existing compensation.
   - The failure page still makes one attempt per exit and ignores errors.
6. Publish the response contract (`canceled` / `paid` / `pending` / `conflict`) for #805.

### #884 — Manual fulfillment (needs #844; D4 and N1 before admin exposure)

1. New module `server/domain/fulfillment/`. **Migration:**
   - `order_fulfillment(order_id PK → checkout_orders, state CHECK IN ('Processing','Packaging','Dispatched','Delivered'), version, tracking_provider, tracking_number, shipment_reference, updated_by, updated_at)`.
   - `order_fulfillment_events(id, order_id, from_state, to_state, version, actor_id, idempotency_key UNIQUE, request_fingerprint, created_at)`.
   - Do **not** use `payload.fulfillment` (F6).
2. **Eligibility** comes from the Orders public API. Fulfillable only if `paid_by_payment_id` is set, the Payment is `PAID`, and the Order is not `OnHold` or `Canceled`. Demo seeds are never eligible.
3. **The Processing row is created on the first operator read or transition** of an eligible order. No change to the payment finalization path.
4. **`transition({orderId, to, expectedVersion, idempotencyKey, actorId, tracking})`:**
   - Forward-only, with a version compare-and-set.
   - `Dispatched` requires a tracking number.
   - Replay and conflict semantics as in #845.
5. **"Needs attention" is computed at read time**, from the durable refund and unrecognized-refund records on a Dispatched order. This avoids new writes in the webhook path. The operator's resolution is stored as a fulfillment event with actor and time, and it clears the flag. No rollback, no stock restore.
6. **Read model:** order list, detail, admin tabs and KPIs show the fulfillment state when a row exists and fall back to the payload status otherwise. The customer sees their own state on the existing order page.
7. **API:** `GET` and `POST /api/operator/orders/:id/fulfillment` with `requireOperator('orders:fulfil')`. Publish the contract for #805, #886 and #888.
8. **Tests:**
   - A duplicate key, and the same key with changed input.
   - A stale version, and two operators racing.
   - A restart.
   - A forged role.
   - A failed write, and out-of-order transitions.
   - Unpaid, `OnHold` and demo-seed orders are rejected.
   - `payload_json` is byte-identical before and after every transition.

### #805 — Admin order actions (Claude; needs #884, #887 and N1)

1. Remove **Mark as Paid** from the UI (`ActionMenu.vue`), the client call and the types. Update the tests.
2. Wire **Cancel** to the #887 contract and show `pending` and `paid` outcomes truthfully. No success toast unless the persisted state changed.
3. Replace the status select and **Fulfill** with forward-only next-state actions from #884, plus a tracking dialog. Remove the client calls to the nonexistent `POST /orders/:id` and `/paid`.
4. Delete `runtimeOrders` from every route (and `server/utils/mockRuntimeOrders.ts` if it has no importer left).
5. Gate order actions behind the operator capability. Demo Admin Preview is read-only.
6. Admin end-to-end specs: every action either works or isn't offered.

### #843 — Listing availability (needs #842)

1. List the actual consumers: home `FeaturedProducts`, search and category, and the reused `ProductCard`.
2. Add a batched `useProductsAvailability(ids)`: at most 50 IDs per request, a request token so stale or out-of-order responses are dropped, and a refetch when the IDs, page or filter change.
3. `ProductCard` stock badge and buy control take their states from the PDP policy. Remove `product.stock` from listing display.
4. Ensure SSR and ISR payloads carry no stock count.
5. End-to-end: one availability request per result page, filter and pagination, failure and zero states, desktop and mobile.

### #888 — Outbox notifications (needs #884; D9)

1. **One validated contact email in the snapshot** for new orders: the account email when signed in; for guests, the existing guest email field (`app/components/order-summary/GuestCheckoutAddressForm.vue:17`), validated on the server and stored as its own `contact.email` field. Today it only travels inside the browser-supplied `shippingDetails` (`app/composables/useOrder.ts:205-211`). Historic orders are untouched.
2. **Migration:** `notification_outbox`:
   - Columns: `id`, `dedupe_key UNIQUE`, `order_id`, `kind`, `recipient`, `body`, `status`, `attempts`, `next_attempt_at`, `lease_owner`, `lease_until`, `last_error`, `created_at`, `sent_at`.
   - `dedupe_key` = order + kind.
3. **Enqueue in the same transaction** as payment confirmation (a payment path, so payment contracts apply) and as the #884 Dispatched transition.
4. **Dispatcher:** claim with `FOR UPDATE SKIP LOCKED` plus a lease. The sink adapter logs by default; local Mailpit is opt-in through environment config only. Backoff; terminal failure after N attempts.
5. **Triggers (D9):** a best-effort kick after the commit, a secret-protected sweep route, and a Vercel Cron entry in `vercel.json`. The owner sets the secret.
6. **Operator view:** list pending and failed notifications, with a retry button.
7. **Tests:**
   - A duplicate webhook, and a duplicate transition.
   - A crash after the commit but before the send.
   - A sink failure followed by a retry.
   - Two dispatchers running at once.
   - No code path can reach a real mail provider.

### #846 — Two-process A1 proof (needs #843 and #845)

1. **Harness:** start two built Nitro processes (`.output/server/index.mjs`) on separate ports, sharing one isolated schema. Reuse the `scripts/with-test-database.mjs` setup; changing it is a protected path. Clean up only the processes and schema it created.
2. **Fixture:** bootstrap one product, then use an operator correction to set it to 5.
3. **Scenario:** 5 → paid → 4 → receipt +3 → 7. Assert the persisted tuple plus the HTTP and UI observations on **both** processes.
4. **Failure matrix:**
   - Duplicate or lost-response checkout and receipt.
   - Two buyers racing, one on each process.
   - Hold expiry.
   - Stale cached metadata vs live stock.
   - `kill -9` between stages, then restart.
5. **Deployment checklist** for N2. Don't claim it passed.

### #886 — EasyPost test mode (split after #885 reports)

- **886.a** Shipping adapter, durable shipment identity, reconcile-before-retry on unknown outcomes. Provider fake only.
- **886.b** Webhook ingestion: HMAC over the raw body, provider-event dedupe, no regression of terminal states, no duplicate notifications. Reconciler trigger per D9.
- **886.c** Customer and operator tracking views, plus the deterministic failure simulator. Simulated progress is labeled as simulation.
- **886.d** Sandbox smoke, run or authorized by the owner.

Each one consumes the #884 contract and never changes the frozen shipping charge.

## 8. Order of work

| Wave    | Owner                                                                     | Claude                       | Codex                |
| ------- | ------------------------------------------------------------------------- | ---------------------------- | -------------------- |
| 0 (now) | D1–D10, O1, O2; open N1–N3; edit the #797 body and the affected child ACs | —                            | Review PR #889       |
| 1       | Merge #889 after O1                                                       | #844                         | #885, then 882-1     |
| 2       | —                                                                         | #845 (if rebalanced) or wait | 882-2, 882-3         |
| 3       | —                                                                         | #887                         | #883                 |
| 4       | —                                                                         | N1 (or Codex)                | #884                 |
| 5       | —                                                                         | #805                         | #881, #843           |
| 6       | —                                                                         | —                            | #888, #846, #886.a–c |
| 7       | 886.d smoke, N2 acceptance run, close #797                                | —                            | —                    |

**#797 is done when:**

- every child above is merged with an independent PASS;
- N2 has run the eight-step scenario on the deployed test-mode environment;
- workstream D lives in its own epic.
