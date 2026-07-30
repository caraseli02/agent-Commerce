# ECAS Progress

## Current focus

- Issue #385 / PR #386 — optimistic add-to-cart; adversarial findings fixed locally (uncommitted).
- GitHub Issues remain the primary task queue.

## In progress

- PR #386 — adversarial hardening ready for commit/push (lint, typecheck, test, build PASS).

## Architecture note (cross-runtime cart pricing)

- Shared pure helpers live in `helpers/cart-pricing.ts` (`resolveTierUnitPrice`, `clampCartQuantity`, `calculateCartLinePricing`).
- Client re-exports via `helpers/prices.helper.ts` (may toast / call `useCart`).
- Nitro mock cart imports `helpers/cart-pricing.ts` directly — do not import `prices.helper.ts` from `server/` (it pulls Vue composables and breaks Nitro).

## Recently completed

- Issue #358 / PR #366 — dashboard console failure cleanup merged to `main`.

- Issue #357 / PR #367 — truthful checkout result states merged to `main`.

- Issue #368 / PR #364 — storefront hardening merged to `main`.

- P2 QA batch on #368 / PR #364:

  - Order summary guest/sign-in CTA uses cookie `token` (SSR-safe) so signed-in buyers no longer flash Guest UI.
  - Dashboard Active Orders / Outstanding Invoices CTAs link to `/dashboard/client?tab=orders` and `/order-tracking`.
  - Footer Review flows hide “Sign in to demo” when authenticated; Order History goes to dashboard orders tab.
  - Hot-sale prices and header free-shipping copy use Lei (regional currency label).
  - Demo category `productCount` matches catalog index; category menu “View all” always navigates to search.
  - `pnpm verify` PASS after the batch.

- Issue #360 — shared `helpers/reviewer-dates.ts` formatter for order/customer/credit/table dates; PR #362 merged.
- Issue #292 — shared control-panel address manager with local mock CRUD and focused browser coverage; PR #342 merged after evaluator PASS.
- Issue #296 — cart type namespace consolidation (tracer bullet); PR #338 merged.
- Issue #290 — dashboard order surfaces now use composable API adapters; PR #330 merged after conflict repair, focused/full verification, signed-in runtime smoke, and evaluator PASS.
- Issue #303 — placeholder storefront/dashboard navigation removed; PR #328 merged after focused tests, full verification, four-route desktop smoke, and 390px mobile drawer smoke.
- Issue #288 — admin Order detail adapter consolidated onto `useOrderConfirmation`; PR #326 merged after focused tests, full verification, review, and signed-in Admin Preview browser smoke.
- Issue #287 — buyer Order Confirmation adapter consolidated onto `useOrderConfirmation`; PR #325 merged after focused tests, full verification, and signed-in browser smoke.
- Issue #304 — `/product-blocks` sandbox route removed; PR #323 merged after `pnpm verify:full` and local core-route browser smoke.
- Issue #251 follow-up — ask-about-product dialog trigger and computed validation styling browser coverage; PR #321 merged.
- Account modal accessibility — keyboard focus trap, role navigation, Escape close, focus restoration, and local browser coverage; PR #312 merged.
- Issue #254 — natural storefront product-section headings; PR #320 merged.
- Mobile audit polish batch — product card 2-line clamp, remaining carousel pill dots, beta overlay dismiss/z-index, drawer category names + singular copy, footer tel nowrap + newsletter label association; browser smoke at 320/390 on `/` passes.
- Issue #241 — manufacturer logo mobile layout; PR #274 merged.
- Issue #239 — footer newsletter responsive/accessibility polish; PR #273 merged.
- Issue #247 — carousel indicator dot rendering; PR #272 merged.
- Issue #246 — featured product card height alignment; PR #271 merged.
- Issue #244 — home search input/icon vertical alignment; PR #270 merged.
- Issue #253 — demo passwords stay hidden in the account panel while role-based sign-in still works; PR #268 merged.
- Issue #261 — Admin Smoke Path E2E signs in through Admin Preview, loads `/dashboard/orders`, `/dashboard/customers`, and `/dashboard/customers/customer-001/control-panel/account`; PR #269 merged.
- Issue #238 — mobile storefront product cards use a compact grid layout with media, details, actions, and cart CTA visually connected; PR #267 merged.
- Issue #234 — mobile mock-mode badge uses an in-flow treatment before content and only floats from the medium breakpoint upward; PR #266 merged.
- Issue #233 — mobile hamburger navigation drawer opens through reliable mobile sheet wiring and exposes primary navigation/category entry points; PR #265 merged.
- Issue #237 — cart side-panel line items use defensive thumbnail extraction and stable shared fallback sizing; PR #264 merged.
- Issue #236 — product detail gallery and zoom media use the shared image fallback component with stable media sizing; PR #263 merged.
- Issue #235 — storefront product cards use the shared image fallback component with stable media sizing; PR #262 merged.
- Issue #54 — control-panel API adapter part A and Shipping/Billing view migration; PR #214 merged.
- Issue #55 — remaining control-panel API calls migrated and `control-panel.service` deleted; PR #215 merged.
- Issue #53 — dashboard/control-panel orders calls migrated to `composables/api/orders`; prerequisite for #54 is closed.
- Issue #52 — orders checkout API adapter migration and checkout E2E failure coverage; PR #212 merged and issue closed before issue #53 pickup.
- Latest open PR was merged before this cleanup pass.
- Issue #73 — PR template with related lectures, evidence, risks, and evaluator rubric.
- Issue #69 — quality gate 1 baseline cleanup (`pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`).
- Issue #25 — ADR 0001 global 401 session redirect (`docs/adr/0001-global-401-session-redirect.md`).
- Issue #19 — gallery layout regression check (`tests/gallery-layout.spec.ts`).

## Blocked / known baseline failures

- No app-code baseline failures from this session.
- Local note: this worktree sits under a parent pnpm workspace, so direct `pnpm verify`/`pnpm verify:full` can trigger pnpm package-manager self-install loops. The equivalent gate commands passed when run with `pnpm --config.manage-package-manager-versions=false`.

## Verification baseline

- `gh issue list --state open --label ready-for-agent`
- `gh label list --limit 50 | grep '^in-progress\b'`
- `./init.sh` — now completes the baseline checks successfully
- `pnpm verify` — fast default gate: build, lint, typecheck, test, feature-list validation
- `pnpm verify:full` — adds architecture invariants and preview smoke when needed
- `pnpm verify:handoff` — clean-tree handoff gate before PR/session completion
- Issue #253 evidence: `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm exec vitest run tests/account-demo-credentials.spec.ts` passes; Playwright smoke on `http://127.0.0.1:3001/?signin=true` at 390px confirms the account panel preselects `customer@demo.com`, leaves the password input empty with the `Hidden for demo sign-in` placeholder, shows hidden-password copy, and signs in to `/dashboard/client?tab=home`; `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify` passes.
- Issue #261 evidence: `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/admin-smoke-path.spec.ts` passes. The test signs in through Admin Preview, verifies redirect to `/dashboard/orders`, verifies an admin order row, loads `/dashboard/customers`, and loads `/dashboard/customers/customer-001/control-panel/account`. Implementation also fixed the mock auth details endpoint so configured demo users preserve their customer/admin roles after sign-in.
- Issue #244 evidence: browser smoke on `http://127.0.0.1:3001/` at 1280px measured 0px vertical center delta between the home search outline, placeholder input box, left search icon, and submit icon; `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify` passes.
- Issue #246 evidence: browser smoke on `http://127.0.0.1:3001/` measured featured product cards at 1280px with two visible rows of four cards each, every card 291px tall and 0px row height delta; at 390px, all visible featured cards measured 174px tall with 0px height delta. Title/info icon center delta measured 0px; `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify` passes.
- Issue #247 evidence: browser smoke on `http://127.0.0.1:3001/` measured product carousel bullets at 1280px as inactive 8x8 circles and active 10x10 circle, and at 390px as inactive 6x6 circles and active 7.5x7.5 circle. Forced click on the next bullet updated active state and `aria-current`; `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify` passes.
- Issue #239 evidence: after dismissing the existing beta dialog, browser smoke on `http://127.0.0.1:3001/` confirms the footer newsletter field is reachable by the `Newsletter email address` label, has placeholder `Enter your email address`, accepts `demo@example.com`, and keeps the submit button text fitting. At 390px and 320px the input and button stack full-width within the viewport; at 1280px they render inline; `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify` passes.
- Issue #240 evidence: browser smoke on `http://127.0.0.1:3001/` after dismissing the existing beta dialog measured the home promotional banner and exclusive-offer card at 320px, 390px, and 1280px. In all three viewports the banner background remains within the viewport, text does not overlap product art, the exclusive-offer CTA stays inside the card, and CTA text fits; `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify` passes.
- Issue #241 evidence: browser smoke on `http://127.0.0.1:3001/` after dismissing the existing beta dialog measured the manufacturer section at 320px, 390px, and 1280px. Mobile renders all 7 logos in a 2-column grid with no clipping and logo heights of 27px+ at 320px and 32px at 390px; desktop keeps the Swiper row visible with all 7 logos unclipped at 1280px; `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify` passes.
- Issue #238 evidence: `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm exec vitest run tests/product-card-image-fallback.spec.ts` passes; mobile browser smoke on `http://127.0.0.1:3001/` at 390px confirms the storefront product card renders as a 358x174 grid card, keeps the cart CTA inside the card and 86px below the title, keeps mobile actions visible, and confirms `/search?keyword=capacitor` renders its empty state with no product cards in mock data; `env NPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false pnpm verify` passes.

## Notes

- Use this file only for durable cross-session state, not transient task notes.
- Do not duplicate GitHub Issues here; mirror only the active issue/PR and baseline facts needed by the next session.

## CI note (PR #409)

- PR template CI gate fixed: verification outcomes, known-risks checkbox, evaluator rubric scores.
