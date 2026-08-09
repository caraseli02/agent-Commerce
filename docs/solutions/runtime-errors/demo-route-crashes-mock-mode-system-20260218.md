---
module: System
date: 2026-02-18
problem_type: runtime_error
component: development_workflow
symptoms:
  - 'Critical demo routes returned Nuxt 500/404 pages instead of rendering'
  - 'Browser/server errors included: does not provide an export named BankInfo / PaymentStatusOption'
  - 'Control panel routes failed in mock mode with Failed to parse URL and missing /api endpoint crashes'
root_cause: config_error
resolution_type: code_fix
severity: critical
tags: [nuxt3, mock-mode, runtime-crash, ssr-fetch, type-imports, demo-flow]
---

# Troubleshooting: Demo Route Crashes in Mock Mode (SSR + Type Imports)

## Problem

The portfolio demo app had multiple flow blockers: key routes crashed with runtime import errors, some protected routes bounced/failed in mock mode, and control-panel pages crashed on server-side fetches to missing mock endpoints.

## Environment

- Module: System-wide demo flow
- Affected Component: Nuxt middleware, API plugin, order/dashboard pages, control-panel settings
- Date: 2026-02-18

## Symptoms

- `/dashboard/orders/:id` and `/order-summary/:id` crashed with runtime module export errors.
- `/dashboard/customers/:slug/control-panel/*` returned 500/404 in mock mode.
- `/order-tracking` previously crashed on nested property access when fixture shape did not match component expectations.
- Homepage had hydration mismatch warnings around header/notification/menu rendering.

## What Didn't Work

**Attempted Solution 1:** Fix only first crashing import in order-confirm views.

- **Why it failed:** Other type-only symbols were still imported as runtime values in adjacent route stack files, so similar crashes persisted in related paths.

**Attempted Solution 2:** Patch only middleware permission checks.

- **Why it failed:** SSR mock-mode API calls still used a relative `/api` base URL on server, causing URL parse failures; additionally, some mock endpoints were missing and unguarded pages still threw.

## Solution

Applied a coordinated demo-first patch set across routing, imports, SSR API base URL, and mock fallbacks.

**Code changes** (key examples):

```ts
// /path/to/components-marketplace/plugins/api.ts
const baseURL = (() => {
  if (!config.MOCK_MODE) return config.BASE_URL_API;
  if (import.meta.client) return '/api';

  const event = nuxtApp.ssrContext?.event;
  const protoHeader = event?.node.req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader || 'http';
  const host = event?.node.req.headers.host || 'localhost:3000';
  return `${protocol}://${host}/api`;
})();
```

```vue
<!-- /path/to/components-marketplace/components/order-confirm/Details.vue -->
<script setup lang="ts">
import { PaymentTypeEnum } from '~/types';
import type { BankInfo, CardInfo } from '~/types';
</script>
```

```ts
// /path/to/components-marketplace/middleware/auth.ts
if (config.public.MOCK_MODE) {
  authStore.addToken('demo-token-portfolio');
  authStore.addUser({
    // ...
    permissions: Object.values(UserPermissionsEnum),
  } as any);
  return;
}
```

```ts
// /path/to/components-marketplace/pages/dashboard/customers/[slug]/control-panel/[view].vue
try {
  const response = await $api.customerProfile.fetchCustomerInformation(route.params.slug as string);
  if (response.status === 'success') customerDetails.value = response.data;
} catch (_err) {
  if (isMockMode.value) {
    customerDetails.value = {
      _id: String(route.params.slug),
      firebaseId: String(route.params.slug),
      accountType: AccountType.Personal,
    } as UserInterface;
  }
}
```

Also implemented:

- `import type` sweep for route-critical files (`order-confirm`, `order-summary`, `dashboard/orders`, transaction options, and related dashboard card/settings files).
- `v-calendar` deep type import removal in `/path/to/components-marketplace/components/dataTable/filter/Date.vue` via local range type.
- Null-safe order-tracking reads + fixture updates in `/path/to/components-marketplace/components/order-tracking/OrderTracking.vue` and `/path/to/components-marketplace/pages/order-tracking.vue`.
- Homepage UX/polish blockers: hero CTA -> `Explore Products` with `/search`, desktop Products menu available at top, mobile text overflow resilience, tab stress behavior, and coherent empty-search state.
- Hydration mitigation with `ClientOnly` around mobile sheet/notifications and mounted-only side effects in header.

## Why This Works

1. Runtime import crashes were caused by type-only symbols being imported as values in ESM runtime paths; `import type` removes these imports from runtime bundles.
2. Mock-mode SSR calls cannot reliably use relative URLs in server context; generating an absolute base URL from request headers fixes `Failed to parse URL` failures.
3. Demo mode had missing mock endpoints for some dashboard settings/profile calls; guarded `try/catch` and deterministic fallback objects prevent hard crashes while preserving demo flow continuity.
4. Route middleware and auth store now share one mock-mode key (`public.MOCK_MODE`) and a consistent full-permission demo user, preventing route gating inconsistencies.

## Prevention

- Add a CI lint rule enforcing `import type` for type-only symbols in `components/`, `pages/`, `services/`, `store/`, and `composables/`.
- Keep a mock-mode SSR rule: any server-side `$fetch` base in mock mode must be absolute.
- For demo routes, fail-soft on missing mock endpoints (never crash SSR page render).
- Include a lightweight smoke checklist before demo handoff:
  - `/dashboard/orders/:id`
  - `/order-summary/:id`
  - `/dashboard/customers/:slug/control-panel/account`
  - `/dashboard/customers/:slug/control-panel/settings`
  - `/order-tracking`
  - `/checkout/session`
  - `/product/categories`

## Related Issues

- See also: [dashboard-demo-flow-filters-and-guards-system-20260218.md](../logic-errors/dashboard-demo-flow-filters-and-guards-system-20260218.md)
