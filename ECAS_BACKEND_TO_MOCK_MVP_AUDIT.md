# ECAS Frontend Audit: Backend-to-Mock MVP Readiness

Date: 2026-02-13

This repository is a Nuxt 3 app with a centralized API plugin (`plugins/api.ts`) that exposes `$api.*` service modules. That centralization is a good foundation for replacing the backend with mocks, but there are a few high-impact integration issues that will slow down mocking unless fixed first.

## Summary

- Frontend is fairly complete across storefront + customer dashboard + admin dashboard.
- Backend integration surface is large:
  - ~18 service modules in `services/`
  - ~163 UI call sites using `$api.*`
  - ~104 service/network call sites across `services/` and `composables/`
- There are multiple P1 issues (env mismatch, malformed request building, hardcoded hosts, error handling) that will affect both “real backend” and “mock backend” modes.

## Findings (highest priority first)

### P1: Env template does not match runtimeConfig keys (setup can silently fail)

- Runtime expects `NUXT_PUBLIC_*` env vars in `nuxt.config.ts` (see `nuxt.config.ts:70` and `nuxt.config.ts:78`).
- Template provides different names in `.env.template` (see `.env.template:1` and `.env.template:9`).

Impact:

- Firebase and API base URL can be `undefined` at runtime (or fall back unintentionally), breaking auth and data fetches.

### P1: Incorrect URL building in user pagination service

- `services/user.service.ts:16` passes a fully-qualified URL into `useFetchAPI(...)`.
- `composables/useFetchAPI.ts:9` already sets `baseURL`, so this can produce malformed URLs.
- `services/user.service.ts:14` accepts `params` but does not use it.

Impact:

- Some API calls can hit the wrong URL and silently fail, which becomes extremely confusing when swapping in mocks.

### P1: Hardcoded backend host bypasses environment/config

- `services/order-summary/cart.service.ts:7` hardcodes `https://dev-backend.ecasmag.ro`.

Impact:

- Any mock strategy (or even switching environments) will have inconsistent behavior: most services use `BASE_URL_API`, but this one bypasses it.

### P1: HTTP layer swallows errors and returns them as typed “success” values

- `composables/HttpFactory.ts:21` catches and returns `err as T`.

Impact:

- Callers can treat failures as valid typed responses.
- Makes it harder to implement reliable UI states (loading/error) and makes mock-vs-real debugging much slower.

### P2: Auth header strategy is inconsistent (`Authorization` vs `x-access-token`)

- `composables/useFetchAPI.ts:15` sets `x-access-token` from cookie.
- Many services set `Authorization: Bearer ...` explicitly.

Impact:

- Backend/mocks need to support both header patterns.
- Increases integration risk and time-to-ship, especially around authenticated pages (`/dashboard/**`, `/checkout/**`, `/order-summary/**`).

### P2: Token captured too early (stale token risk)

- `services/user.service.ts:12` stores `this.token = this.authStore.getToken()` at construction time.
- `composables/useCategories.ts:25` reads token once when composable is created.

Impact:

- After login/logout/token refresh, some requests may use stale state.
- This tends to show up as “random 401s” or “works only after refresh”.

### P2: Large API surface with no automated tests detected

No `*.spec.*` / `*.test.*` files were detected during repository scan.

Impact:

- Migrating to mocks will require mostly manual QA unless tests are added (even a small Playwright smoke suite would reduce risk).

## MVP Scope Clarification (for estimation)

There are two realistic interpretations of “MVP” here:

1. **Storefront MVP** (customer-facing only):

   - auth (login/signup/password reset)
   - catalog/search/product detail
   - cart
   - checkout flow + order summary
   - customer settings (shipping/billing/cards)
   - minimal customer dashboard widgets

2. **Full-feature MVP** (includes admin/dashboard parity):
   - all above
   - admin orders dashboard + customer management + control panel + smart pricing + documents + notifications

## Estimate (backend to mocks + ship MVP)

Assumptions:

- 1 experienced Nuxt/Vue dev
- mocks are local (no real backend dependencies)
- keep UI largely as-is, avoid redesign

### Option A: Storefront MVP only (recommended for fastest delivery)

- **15–22 working days (3–5 weeks)**

Breakdown:

- Fix P1 blockers (env + hardcoded host + obvious request bugs): 3–5 days
- Implement mock layer + seed data model: 3–4 days
- Mock domains:
  - auth/user/profile/cards: 2–3 days
  - products/search/categories: 3–4 days
  - cart/checkout/orders/payment states: 4–6 days
  - notifications/general settings: 1–2 days
- QA + regression + demo scripts: 3–4 days

### Option B: Full feature parity including admin dashboards

- **34–49 working days (7–10 weeks)**

Why it’s longer:

- Many additional endpoints and richer data shapes (orders widgets, customers analytics, transactions/audit logs, pricing settings).
- More role/permission-sensitive routes (see `middleware/router.global.ts`).

## Recommended Technical Approach for Mocks

Best “low churn” path for this codebase:

- Keep `plugins/api.ts` as the single injection point for `$api`.
- Introduce a “mock fetcher” compatible with `ohmyfetch` interface:
  - Use runtime flag (env/config) to choose between real `$fetch.create({ baseURL })` and mock fetcher.
  - Implement mock routes matching the current service URLs.
- Remove hardcoded hosts and ensure **all** requests use a single base URL strategy.

## Next Steps

If you confirm which MVP you want (Storefront-only vs Full-feature), the next deliverable should be:

- a page-by-page MVP cut list
- a mock endpoint contract list (routes + response shapes)
- a prioritized implementation checklist aligned to the estimate above
