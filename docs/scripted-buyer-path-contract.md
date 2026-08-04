# Scripted Buyer Path — use-case contract

Durable contract for the **Scripted Buyer Path** (Portfolio Demo gate). Agents and reviewers use this document to decide what must stay reliable before broader polish.

**Glossary:** terms below match [`CONTEXT.md`](../CONTEXT.md) (Portfolio Demo, Buyer Review Story, Scripted Buyer Path, Admin Preview, Mock Integration Boundary, Order Confirmation).

---

## 1. Problem statement

Reviewers need a **credible, rehearsed storefront walkthrough** without live production integrations. The Scripted Buyer Path is the minimum **Buyer Review Story** that must work end to end in **mock mode**: discover a product, add it to cart, reach order summary / checkout surfaces, sign in with demo credentials when required, and see order confirmation evidence.

Anything that breaks this path is a **Portfolio Demo Blocker** or **Demo Trust Risk**, even when off-path features still technically work.

---

## 2. Scope

### In scope

- Storefront entry (`/`), product discovery (home, search, product detail)
- Cart chrome (header badge, favorites/cart modal) and cart mutations in mock mode
- Order summary and checkout entry surfaces reachable from cart
- Demo customer sign-in (`customer@demo.com`) via account modal or auth-required redirects
- **Order Confirmation** after a placed order (buyer-facing route)
- **Desktop-First Demo Standard** layout on the path above; mobile must not show broken navigation or blocked primary actions
- Behavior bounded by the **Mock Integration Boundary** (local Nitro mocks, no live Stripe or production backend)

### Out of scope

- **Admin Preview** / **Admin Smoke Path** (separate contract; optional chapter)
- Dashboard control-panel configuration, admin-only mutations, and full back-office workflows
- Live Stripe capture, production auth hardening, real customer data persistence
- Whole-app polish, every route complete, or exhaustive exploratory QA
- SEO, performance tuning, and security hardening unless they break the Scripted Buyer Path

### Assumptions

- `NUXT_PUBLIC_MOCK_MODE=true` in `.env` (see `README.md`)
- App runs at `http://localhost:3000` (or equivalent preview host)
- Demo credentials documented in `README.md` are available
- Verification baseline: `pnpm verify` plus buyer-path browser smoke (see §5)

---

## 3. Admin Preview vs Scripted Buyer Path

| Dimension      | Scripted Buyer Path                                              | Admin Preview                                                                 |
| -------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Primary actor  | Reviewer as demo **customer**                                    | Reviewer as demo **admin** (optional)                                         |
| Demo gate      | **Yes** — Portfolio Demo Blockers apply here first               | **No** — supporting chapter only                                              |
| Entry          | Storefront `/`, search, product pages                            | `/dashboard` after admin sign-in                                              |
| Minimum proof  | Browse → cart → summary → confirmation with customer credentials | **Admin Smoke Path**: dashboard, orders, one customer surface without crashes |
| Auth           | `customer@demo.com` / `customer123`                              | `admin@demo.com` / `admin123`                                                 |
| Failure impact | Blocks calling the Portfolio Demo “working”                      | Degrades optional preview; does not redefine MVP                              |

Agents must not fold Admin Preview requirements into Scripted Buyer Path tasks unless the issue explicitly spans both.

---

## 4. Use cases

### UC-1 — Happy path: browse to order confirmation

**Actor:** Reviewer (guest → customer)  
**Precondition:** Mock mode on; cart empty or acceptable to add another line.

1. Land on `/` and reach a product via home featured grid, search, or direct product URL.
2. Open product detail; confirm title, price, and primary media or fallback render without layout breakage.
3. Add product to cart; header cart badge / cart modal reflects the new quantity.
4. Open cart and proceed to order summary / checkout entry.
5. Sign in with demo customer credentials if prompted.
6. Complete or reach Order Confirmation with order reference and payment summary visible.

**Postcondition:** Order Confirmation shows consistent order facts; no `500` error pages on the path.

### UC-2 — Search-led discovery

**Actor:** Reviewer  
**Precondition:** Mock mode on.

1. Open search (`/search` or header search).
2. Run a query that returns mock results.
3. Open a result and continue UC-1 steps 3–6 from product detail.

**Postcondition:** Search results and filters do not crash; selected product is addable to cart.

### UC-3 — Auth-required gate

**Actor:** Reviewer (signed out)  
**Precondition:** Mock mode on; session not authenticated.

1. Add a product to cart as guest where allowed.
2. Attempt to proceed to a surface that requires authentication (order summary / checkout / account-only action).
3. Sign in through the account modal with `customer@demo.com`.
4. Resume the flow without losing cart context.

**Postcondition:** Auth modal shows field validation errors for invalid input; successful sign-in returns reviewer to the buyer flow without auth loops.

### UC-4 — Empty cart edge

**Actor:** Reviewer  
**Precondition:** Cart has zero line items.

1. Open cart modal or cart route.
2. Observe empty-state messaging (not a crash or blank panel).
3. Follow a suggested recovery action (e.g. continue shopping → home or search).

**Postcondition:** Empty cart does not `500`; reviewer can re-enter UC-1.

### UC-5 — Cart update feedback

**Actor:** Reviewer (guest or signed-in customer)  
**Precondition:** At least one product in cart.

1. Change quantity or remove a line in the cart modal.
2. Observe header badge and cart totals update without a full page reload.
3. Proceed toward order summary.

**Postcondition:** Cart chrome stays in sync with store state; no stale badge after mutation.

### UC-6 — Order summary with existing mock order (optional deep link)

**Actor:** Signed-in customer  
**Precondition:** Mock order id available (e.g. `ord-1` in demo data).

1. Open `/order-summary/<orderId>` (or equivalent confirmation route).
2. Confirm header metadata, line items, and payment summary render.

**Postcondition:** Order Confirmation facts match mock data; page is not an error shell.

---

## 5. Shall-style requirements

Derived from §4. Wording is behavioral; implementation may change if these outcomes hold.

| ID   | Requirement                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1  | The Scripted Buyer Path **shall** run entirely against the **Mock Integration Boundary** with no undeclared live backend dependency.                                                  |
| R-2  | Storefront entry, search, and product detail **shall** return HTTP 200 in mock mode for representative demo skus.                                                                     |
| R-3  | Add-to-cart **shall** update cart chrome (badge and/or modal) visible on the path without requiring manual refresh.                                                                   |
| R-4  | Cart quantity changes and line removal **shall** keep totals and badge counts consistent with Pinia cart state.                                                                       |
| R-5  | Auth-required steps **shall** accept demo customer credentials and **shall not** enter redirect loops.                                                                                |
| R-6  | Sign-in and buyer-path form fields **shall** expose validation and `aria-invalid` (or equivalent) on error.                                                                           |
| R-7  | Empty cart **shall** present a recoverable empty state, not a server error or blank modal.                                                                                            |
| R-8  | Order summary and Order Confirmation **shall** display order reference and payment summary fields for successful mock orders.                                                         |
| R-9  | Scripted Buyer Path routes **shall not** render Nuxt `500` pages during `node scripts/smoke.mjs` buyer checks (`/`, `/cart`, `/checkout`) and documented sign-in / signup smoke URLs. |
| R-10 | Changes to Admin Preview surfaces **shall not** be required to satisfy Scripted Buyer Path acceptance unless an issue explicitly lists both.                                          |
| R-11 | Regressions on the path **shall** be caught by `pnpm verify` and buyer-path browser smoke before PR handoff.                                                                          |

---

## 6. Verification hooks

- **Fast gate:** `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify`
- **Runtime smoke:** `node scripts/smoke.mjs` (/, /cart, /checkout)
- **Representative URLs:** `/`, `/search`, `/signup`, `/forgot-password`, `/order-summary` (see `docs/plans/2026-02-18-demo-route-smoke-checklist.md` for extended checklist)
- **Demo credentials:** `README.md` § Demo credentials

---

## 7. Related documents

- [`CONTEXT.md`](../CONTEXT.md) — glossary and autonomous loop rules
- [`docs/plans/2026-02-18-demo-route-smoke-checklist.md`](./plans/2026-02-18-demo-route-smoke-checklist.md) — extended route checklist (includes Admin Preview routes)
- [`docs/agents/verification.md`](./agents/verification.md) — evaluator verification ladder
