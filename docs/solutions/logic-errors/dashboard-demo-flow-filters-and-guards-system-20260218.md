---
module: System
date: 2026-02-18
problem_type: logic_error
component: development_workflow
symptoms:
  - 'Customer-scoped order tables showed all orders even when userId was provided'
  - "Dashboard Orders 'Last 24h' tab did not apply date filtering and displayed incorrect counts"
  - 'Control panel shipping/billing edits silently no-op for organization accounts'
root_cause: logic_error
resolution_type: code_fix
severity: high
tags: [nuxt3, dashboard-orders, control-panel, mock-mode, demo-flow, filters]
---

# Troubleshooting: Dashboard Demo Flow Regressions (Order Filters + Control Panel Guards)

## Problem

After the mock/demo stabilization work, core dashboard flows were still unreliable: order list scoping/filtering behaved incorrectly and organization control-panel address actions did not persist.

## Environment

- Module: System-wide dashboard demo flow
- Affected Component: Orders API contract layer, admin order tab filtering, control-panel shipping/billing views
- Date: 2026-02-18

## Symptoms

- `/api/orders?userId=mock-user-1` returned the same total as unscoped `/api/orders`.
- In `/dashboard/orders`, selecting **Last 24h** did not consistently apply server date filtering.
- In customer control panel, organization (`accountType = 2`) shipping/billing edit/default actions returned early and did nothing.
- Browser smoke initially exposed a runtime regression (`OrderTableColumnsEnum is not defined`) after tab-filter refactor.

## What Didn't Work

**Attempted Solution 1:** Filter `/api/orders` by `order.user._id` after mapping mock orders.

- **Why it failed:** mock order mapping assigned `user._id` from the request-scoped `userId`, so all rows matched and the filter leaked data.

**Attempted Solution 2:** Only normalize `startDate` in API parsing and keep tab `value` as `'startDate'`.

- **Why it failed:** DataTable column-filter transformations still keyed date filters via `createdAt`, creating inconsistent server filter payloads.

## Solution

Applied a coordinated fix across API scoping, tab filter mapping, and control-panel account-type guards.

**Code changes**:

```ts
// /path/to/components-marketplace/server/api/orders.get.ts
import { getDemoOrders, getDemoOrdersForUser } from '~/server/utils/mockDashboardDemo';

let items = query.userId ? getDemoOrdersForUser(query.userId) : getDemoOrders();
```

```ts
// /path/to/components-marketplace/server/api/orders.get.ts
const parseStartDate = (value?: string) => {
  // supports ISO and DD/MM/YYYY HH:mm:ss fallback
};
```

```ts
// /path/to/components-marketplace/components/admin-table/order/Order.vue
import { OrderTableColumnsEnum } from '~/components/client-table/order/columns.enum';

{
  label: 'Last 24h',
  value: OrderTableColumnsEnum.CREATED_AT,
  key: [moment.utc().subtract(24, 'hours').format('DD/MM/YYYY HH:mm:ss')],
}
```

```ts
// /path/to/components-marketplace/components/admin-table/order/Order.vue
const getServerFiltersByTab = (filter) => {
  // maps createdAt/startDate tab to startDate ISO for API
};

await fetchAndSetOrdersList(1, 10, getServerFiltersByTab(filter), {});
```

```ts
// /path/to/components-marketplace/components/dashboard/control-panel/ShippingView.vue
if (!props.id || props.accountType === null || typeof props.accountType === 'undefined') return;
```

```ts
// /path/to/components-marketplace/components/dashboard/control-panel/BillingView.vue
if (!props.id || props.accountType === null || typeof props.accountType === 'undefined') return;
```

## Why This Works

1. **Correct scoping source:** user-scoped order lists now use `getDemoOrdersForUser` directly instead of filtering against request-mutated row user ids.
2. **Consistent date filter contract:** tab UI, DataTable filters, and API parser now align on `startDate` semantics.
3. **Guard logic fixed for organization flows:** explicit null/undefined checks allow valid non-personal account types through.
4. **Refactor regression closed:** importing `OrderTableColumnsEnum` removed the runtime reference error introduced during tab-filter refactor.

## Verification

- API check:
  - `/api/orders?page=1&perPage=100` => `30`
  - `/api/orders?page=1&perPage=100&userId=mock-user-1` => `17`
- Browser smoke after fixes:
  - `/dashboard/orders` loads without Nuxt 500
  - Last 24h tab shows filtered/empty state correctly
  - `/dashboard/customers/mock-user-1/control-panel/shipping` loads and edit modal save path is functional

## Prevention

- Keep mock mappers request-agnostic; never rewrite row ownership fields from query params.
- For table tabs, use a dedicated server-filter mapper and avoid relying on column filter side effects.
- Use explicit null/undefined checks for enum-like props (`accountType`), not truthy/falsy guards.
- Add a lightweight demo smoke set before handoff:
  - `/dashboard/orders` tab switching
  - `/dashboard/customers/:slug/control-panel/shipping`
  - `/dashboard/customers/:slug/control-panel/billing`

## Related Issues

- See also: [demo-route-crashes-mock-mode-system-20260218.md](../runtime-errors/demo-route-crashes-mock-mode-system-20260218.md)
