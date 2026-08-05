# Buyer Flow — design contract

Design contract for the storefront **Buyer Flow** capability (see [`CONTEXT.md`](../CONTEXT.md)). Agents use this document for problem, scope, use cases, and shall-style requirements before implementing or evaluating work on that flow.

In use cases below, **Reviewer** means the person walking the Portfolio Demo (see [`CONTEXT.md`](../CONTEXT.md)), not a reader of this contract.

**Glossary:** use [`CONTEXT.md`](../CONTEXT.md) terms as defined there (Portfolio Demo, Buyer Review Story, Buyer Flow, Admin Preview, Mock Integration Boundary, Order Confirmation). Do not redefine them here. Older issues may still say “Scripted Buyer Path”; prefer **Buyer Flow**.

---

## 1. Problem statement

Design a storefront buyer flow that lets a demo customer discover a product, manage a cart, authenticate when required, and reach Order Confirmation entirely within the **Mock Integration Boundary**.

This document captures the design contract for that capability: scope, use cases, and shall-style requirements.

---

## 2. Scope

### Includes

- Product discovery via storefront entry (`/`), search, and product detail
- Cart chrome (header badge, cart modal) and cart line mutations in mock mode
- Order summary and checkout entry surfaces reachable from cart
- Demo customer authentication when a step requires sign-in (`customer@demo.com` via account modal or auth-required redirects)
- Buyer-facing **Order Confirmation** after a placed mock order
- **Desktop-First Demo Standard** layout on this path; mobile must keep primary navigation and actions usable
- Behavior bounded by the **Mock Integration Boundary** (local Nitro mocks only)

### Excludes

- **Admin Preview** / **Admin Smoke Path** (separate capability; see §3)
- Dashboard control-panel configuration, admin-only mutations, and full back-office workflows
- Live Stripe capture, production auth hardening, and real customer data persistence
- Whole-app polish, every route complete, or exhaustive exploratory QA
- SEO, performance tuning, and security hardening unless they break this buyer flow

### Assumptions

- `NUXT_PUBLIC_MOCK_MODE=true` in `.env` (see `README.md`)
- App runs at `http://localhost:3000` (or equivalent preview host)
- Demo credentials documented in `README.md` are available
- Verification baseline: `pnpm verify` plus buyer-flow browser smoke (see §6)

---

## 3. Design boundary: Admin Preview vs Buyer Flow

| Dimension      | Buyer Flow                                                       | Admin Preview                                                                 |
| -------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Primary actor  | Reviewer as demo **customer**                                    | Reviewer as demo **admin** (optional)                                         |
| Design target  | Discovery → cart → auth gate → Order Confirmation                | Dashboard / back-office surfaces                                              |
| Entry          | Storefront `/`, search, product pages                            | `/dashboard` after admin sign-in                                              |
| Minimum proof  | Browse → cart → summary → confirmation with customer credentials | **Admin Smoke Path**: dashboard, orders, one customer surface without crashes |
| Auth           | `customer@demo.com` / `customer123`                              | `admin@demo.com` / `admin123`                                                 |
| Failure impact | Blocks calling the Portfolio Demo “working”                      | Degrades optional preview; does not redefine this design                      |

Agents must not fold Admin Preview requirements into this Buyer Flow design unless an issue explicitly spans both.

---

## 4. Use cases

How the Reviewer interacts with the designed Buyer Flow.

### UC-1 — Happy path: discovery to Order Confirmation

**Actor:** Reviewer (guest → customer)  
**Precondition:** Mock mode on; cart empty or acceptable to add another line.

1. Land on `/` and reach a product via home featured grid, search, or direct product URL.
2. Open product detail; see title, price, and primary media or fallback without layout breakage.
3. Add the product to cart; header cart badge / cart modal shows the new quantity.
4. Open cart and proceed to order summary / checkout entry.
5. Sign in with demo customer credentials if prompted.
6. Complete checkout or open Order Confirmation with order reference and payment summary visible.

**Postcondition:** Order Confirmation shows consistent order facts; no `500` error pages on the path.

### UC-2 — Search-led discovery

**Actor:** Reviewer  
**Precondition:** Mock mode on.

1. Open search (`/search` or header search).
2. Run a query that returns mock results.
3. Open a result and continue UC-1 from product detail (add to cart through Order Confirmation).

**Postcondition:** Search results and filters do not crash; selected product is addable to cart.

### UC-3 — Auth-required gate

**Actor:** Reviewer (signed out)  
**Precondition:** Mock mode on; session not authenticated.

1. Add a product to cart as guest where allowed.
2. Attempt a step that requires authentication (order summary / checkout / account-only action).
3. Sign in through the account modal with `customer@demo.com`.
4. Resume the buyer flow without losing cart context.

**Postcondition:** Invalid credentials show field validation errors; successful sign-in returns the Reviewer to the buyer flow without auth loops.

### UC-4 — Empty cart

**Actor:** Reviewer  
**Precondition:** Cart has zero line items.

1. Open cart modal or cart route.
2. See empty-state messaging (not a crash or blank panel).
3. Follow a recovery action (e.g. continue shopping → home or search).

**Postcondition:** Empty cart does not `500`; Reviewer can re-enter UC-1.

### UC-5 — Cart line updates

**Actor:** Reviewer (guest or signed-in customer)  
**Precondition:** At least one product in cart.

1. Change quantity or remove a line in the cart modal.
2. See header badge and cart totals update without a full page reload.
3. Proceed toward order summary.

**Postcondition:** Cart chrome stays in sync with cart state; badge is not stale after the mutation.

### UC-6 — Order Confirmation deep link

**Actor:** Signed-in customer  
**Precondition:** Mock order id available (e.g. `ord-1` in demo data).

1. Open `/order-summary/<orderId>` (or equivalent confirmation route).
2. See header metadata, line items, and payment summary render.

**Postcondition:** Order Confirmation facts match mock data; page is not an error shell.

---

## 5. Shall-style requirements

Derived from §4. Behavioral expectations of the designed flow; implementation may change if these outcomes hold.

| ID   | Requirement                                                                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R-1  | The Buyer Flow **shall** run entirely against the **Mock Integration Boundary** with no undeclared live backend dependency.                                                                                                                      |
| R-2  | Storefront entry, search, and product detail **shall** return HTTP 200 in mock mode for representative demo skus.                                                                                                                                |
| R-3  | Add-to-cart **shall** update cart chrome (badge and/or modal) on the path without requiring manual refresh.                                                                                                                                      |
| R-4  | Cart quantity changes and line removal **shall** keep totals and badge counts consistent with cart store state.                                                                                                                                  |
| R-5  | Auth-required steps **shall** accept demo customer credentials and **shall not** enter redirect loops.                                                                                                                                           |
| R-6  | Sign-in and buyer-flow form fields **shall** expose validation and `aria-invalid` (or equivalent) on error.                                                                                                                                      |
| R-7  | Empty cart **shall** present a recoverable empty state, not a server error or blank modal.                                                                                                                                                       |
| R-8  | Order summary and Order Confirmation **shall** display order reference and payment summary fields for successful mock orders.                                                                                                                    |
| R-9  | Buyer Flow routes covered by `pnpm smoke` (`/`, `/cart`, `/checkout`) **shall not** render Nuxt `500` pages. Sign-in / signup / forgot-password URLs are covered by the extended checklist and Playwright buyer-path specs, not by `pnpm smoke`. |
| R-10 | Satisfying this design **shall not** require Admin Preview surface changes unless an issue explicitly lists both capabilities.                                                                                                                   |
| R-11 | Regressions on the Buyer Flow **shall** be caught by `pnpm verify` and buyer-flow browser smoke before PR handoff.                                                                                                                               |

---

## 6. Verification hooks

- **Fast gate:** `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify`
- **Runtime smoke:** `pnpm smoke` (core static routes such as `/`, `/cart`, `/checkout` — selected from `pages/`; does **not** cover `/signup` or `/forgot-password`)
- **Extended / auth URLs (manual or Playwright, not `pnpm smoke`):** `/`, `/search`, `/signup`, `/forgot-password`, `/order-summary` (see `docs/plans/2026-02-18-demo-route-smoke-checklist.md` and `tests/e2e/buyer-path-order-summary.spec.ts`)
- **Demo credentials:** `README.md` § Demo credentials

---

## 7. Related documents

- [`CONTEXT.md`](../CONTEXT.md) — glossary and autonomous loop rules
- [`docs/plans/2026-02-18-demo-route-smoke-checklist.md`](./plans/2026-02-18-demo-route-smoke-checklist.md) — extended route checklist (includes Admin Preview routes)
- [`docs/agents/verification.md`](./agents/verification.md) — evaluator verification ladder
