# Feature Prioritization Audit

Date: 2026-07-09

## Purpose

Use a lightweight prioritization pass to decide which Components Marketplace app features deserve to stay in the portfolio demo, which should be simplified, and which are candidates for removal.

The app goal used for scoring is the current repo goal: a self-contained Nuxt e-commerce portfolio demo with storefront, account, dashboard, cart, checkout, and local Nitro mock endpoints.

## Scoring Model

RICE needs real reach data, which this demo does not have. For this pass, use ICE plus MoSCoW:

- Impact: value to the portfolio reviewer or core demo journey, 1-10.
- Confidence: how strongly the repo evidence supports that value, 1-10.
- Ease: low maintenance and easy verification, 1-10.
- ICE: `Impact * Confidence * Ease / 10`.
- MoSCoW: final product call for this demo phase.

Interpretation:

- `Must`: core demo route or flow.
- `Should`: valuable, but can be narrower than the current implementation.
- `Could`: keep only if it is cheap, already working, and not distracting.
- `Won't`: remove, hide, or stop investing in this demo phase.

## Feature Scores

| Feature                                           | Evidence                                                                        | Impact | Confidence | Ease |  ICE | MoSCoW | Recommendation                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | -----: | ---------: | ---: | ---: | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Storefront home and merchandising                 | `/`, `components/home`, `components/global/*`, home/mobile tests                |     10 |         10 |    8 | 80.0 | Must   | Keep. This is the first reviewer impression.                                                                                 |
| Product search and category browse                | `/search`, `/product/categories`, search components, search API mock            |      9 |          9 |    7 | 56.7 | Must   | Keep, but avoid expanding filter complexity without evidence.                                                                |
| Product detail, gallery, specs, quantity controls | `/product/[slug]`, gallery tests, browse E2E                                    |     10 |         10 |    7 | 70.0 | Must   | Keep. This is one of the clearest demo-quality flows.                                                                        |
| Cart side panel and order summary                 | cart store/API, `/order-summary`, cart/order E2E                                |     10 |         10 |    7 | 70.0 | Must   | Keep. Core commerce proof.                                                                                                   |
| Mock checkout happy path                          | `/checkout`, `/checkout/session`, `/checkout/success`, `useOrder`, checkout API |     10 |          9 |    6 | 54.0 | Must   | Keep. Simplify payment ceremony if it distracts from the demo.                                                               |
| Checkout fail and pending states                  | `/checkout/fail`, `/checkout/pending`, tests around failure routing             |      7 |          8 |    6 | 33.6 | Should | Keep as compact resilience states; do not expand.                                                                            |
| Auth and demo sign-in                             | account modal, auth store/API, demo credentials tests                           |     10 |         10 |    7 | 70.0 | Must   | Keep. Hidden demo passwords decision stays valid.                                                                            |
| Signup flow                                       | `/signup`, signup components, known issues doc says de-scoped                   |      3 |          9 |    4 | 10.8 | Won't  | Remove from demo navigation and stop polishing. Consider deleting after confirming no desired portfolio story depends on it. |
| Forgot/reset/verify email flows                   | `/forgot-password`, `/password-reset`, `/verify-email`, `/actions`              |      4 |          7 |    5 | 14.0 | Could  | Keep only minimal standalone routes if auth completeness matters; remove `/actions` aggregator.                              |
| Customer dashboard home and order history         | `/dashboard/client`, account order history E2E                                  |      8 |          9 |    6 | 43.2 | Should | Keep a focused customer account story: orders, recent activity, saved addresses/cards.                                       |
| Client settings tabs                              | `components/dashboard/client/settings/*`                                        |      5 |          6 |    4 | 12.0 | Could  | Simplify. Keep details/shipping/billing/payments if reachable; cut alerts/marketing/security polish unless demoed.           |
| Admin customer dashboard                          | `/dashboard`, `/dashboard/customers`, admin smoke E2E                           |      8 |          9 |    6 | 43.2 | Should | Keep. It shows B2B/admin depth.                                                                                              |
| Admin orders list and order detail                | `/dashboard/orders`, `/dashboard/orders/[id]`, admin smoke E2E                  |      8 |          9 |    6 | 43.2 | Should | Keep. Strong companion to checkout.                                                                                          |
| Customer profile and control panel                | `/dashboard/customers/[slug]`, control-panel routes/tests                       |      7 |          8 |    5 | 28.0 | Should | Keep one polished path, especially account/shipping/billing. Avoid growing settings complexity.                              |
| Admin product category management                 | `/dashboard/products/categories`, category components                           |      5 |          6 |    4 | 12.0 | Could  | Hide from primary nav unless it is part of the walkthrough. Deletion is a later small bet because there are many components. |
| Smart Pricing admin                               | `/dashboard/settings/smart-price`, smart-pricing components/store               |      4 |          5 |    3 |  6.0 | Won't  | Remove from demo nav now; consider deleting after checking no tests or screenshots depend on it.                             |
| Order tracking standalone page                    | `/order-tracking`, `components/order-tracking`                                  |      4 |          5 |    5 | 10.0 | Could  | Hide or remove unless linked from order detail. It is not in the current key review flow.                                    |
| Favorites                                         | header favorites button, favorites modal components/API adapter                 |      3 |          5 |    4 |  6.0 | Won't  | Remove or hide from header. It competes with cart but has weak visible demo value.                                           |
| Notifications                                     | header/dashboard notification UI and API mock                                   |      4 |          6 |    5 | 12.0 | Could  | Keep only if dashboard needs activity texture; remove from storefront header if noisy.                                       |
| Regional preferences                              | top bar modal/store                                                             |      3 |          6 |    7 | 12.6 | Could  | Keep if it is visually harmless; otherwise hide because it does not affect the demo.                                         |
| Header informational links                        | News, How to Buy, About, Contact all route to `/`                               |      2 |         10 |   10 | 20.0 | Won't  | Remove or replace with real anchors. Current placeholders reduce trust.                                                      |
| Dashboard placeholder nav items                   | Reports, Analytics, stock, store/layout/campaign/users links route to `/`       |      2 |         10 |    9 | 18.0 | Won't  | Remove placeholder dropdown entries before deleting real pages. This is high-confidence cleanup.                             |
| Product blocks sandbox                            | `/product-blocks`                                                               |      2 |          9 |    8 | 14.4 | Won't  | Delete route if it is only a component playground.                                                                           |
| Mock API infrastructure                           | `server/api`, `server/utils/mock*`, API boundary tests                          |     10 |         10 |    6 | 60.0 | Must   | Keep. It is the reason the demo is self-contained.                                                                           |

## Removal Backlog

Start with small, reversible cleanup before deleting large feature folders.

1. Remove placeholder navigation entries that route to `/`.

   - Header: News, How to Buy, About, Contact.
   - Dashboard: Reports, Analytics, stock, store/layout/campaign/users placeholders.
   - Rationale: high confidence, low risk, immediately improves perceived quality.

2. Remove or hide `/product-blocks`.

   - Rationale: looks like a development sandbox, not a portfolio feature.
   - Verification: route smoke should not include it; `pnpm verify`.

3. Remove Smart Pricing from dashboard navigation.

   - Rationale: lowest ICE among real routed admin pages and not part of the documented key review flow.
   - Follow-up: delete `pages/dashboard/settings/smart-price.vue`, `components/smart-pricing/*`, and `store/pricingStore.ts` only after a dedicated verification pass.

4. Hide Favorites from the storefront header.

   - Rationale: weak value compared with cart, no clear portfolio story.
   - Follow-up: delete favorites modal/API code only after confirming no account/dashboard surface depends on it.

5. De-scope Signup and account-action extras.

   - Rationale: `docs/ui-review-known-issues.md` already marks signup as de-scoped.
   - Suggested action: keep direct auth sign-in, remove demo links into signup, and delete `/actions` if unused.

6. Simplify customer/admin settings surfaces.
   - Rationale: preserve one polished account/control-panel path, remove tabs that only add form weight without demo payoff.
   - Suggested keep: details, shipping, billing, payment summary.
   - Suggested cut: marketing, alerts, security, advanced customer-credit editing unless explicitly demoed.

## Validation Checkpoints

## Framework migration gate

The Nuxt 4 migration tracked in GitHub issue #461 is complete and verified. The remaining framework-epic work is not a generic type-check backlog: Zod 4 remains deferred until the stable vee-validate adapter supports it, while TanStack Table 9 requires a dedicated shared-table API and type-contract migration. Do not bundle reviewer-flow behavior changes into either follow-up; validate them separately.

Use small bets:

1. Make one removal or nav-hiding change.
2. Run `pnpm verify`.
3. If the change touches routing or UI navigation, run a smoke pass over `/`, `/search`, `/product/prod-1`, `/order-summary`, `/dashboard/client`, `/dashboard/orders`, and `/dashboard/customers`.
4. Revisit the score after screenshots or reviewer feedback.

## Bias Checks

- Recency bias: recent mobile polish should not force every mobile-polished component to stay forever.
- Effort bias: do not keep low-value features only because deletion is annoying; split deletion into small safe bets.
- Stakeholder bias: apply the same portfolio-demo criteria to admin, customer, and storefront features.
- Completeness bias: this does not need to be a full commerce back office; it needs to be a convincing demo.
