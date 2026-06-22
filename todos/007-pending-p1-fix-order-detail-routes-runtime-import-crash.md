---
status: completed
priority: p1
issue_id: '007'
tags: [code-review, runtime, typescript, routing, demo]
dependencies: []
---

# Fix Order Detail Routes Runtime Import Crash

## Problem Statement

`/order-summary/:id` and `/dashboard/orders/:id` currently crash at runtime with a Nuxt error page because type-only symbols are imported as runtime values from `~/types`.

This blocks key demo order detail flows and creates a broken portfolio walkthrough.

## Findings

- Reproduced crash on:
  - `http://localhost:3000/order-summary/abc`
  - `http://localhost:3000/dashboard/orders/abc`
- Console error:
  - `does not provide an export named 'BankInfo'`
- Primary source:
  - `/Users/vladislavcaraseli/Documents/Ecas/components/order-confirm/Details.vue:4`
  - `import { BankInfo, CardInfo, PaymentTypeEnum } from '~/types';`
- Additional adjacent files in the same stack still import interfaces from `~/types` as runtime values:
  - `/Users/vladislavcaraseli/Documents/Ecas/components/order-confirm/BackItems.vue:3`
  - `/Users/vladislavcaraseli/Documents/Ecas/components/order-confirm/StackItems.vue:4`
  - `/Users/vladislavcaraseli/Documents/Ecas/components/order-confirm/PaySummary.vue:3`

## Proposed Solutions

### Option 1: Convert only proven crashing imports (fastest unblock)

**Approach:** Update only files confirmed in crashing routes to use `import type` for interfaces.

**Pros:**

- Fast, low-risk unblock
- Minimal diff

**Cons:**

- Other latent crashes may remain in nearby flows

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 2: Convert all order-confirm and order detail route imports systematically

**Approach:** Audit all files used by order detail pages and convert every interface/type-only import to `import type`.

**Pros:**

- Fixes root class of issues in this feature area
- Reduces repeated crash/fix cycle

**Cons:**

- Larger patch
- Needs quick regression pass

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 3: Add lint rule guard for type-only imports

**Approach:** Add ESLint/TS rule to enforce `import type` for type-only symbols, then fix violations in affected directories.

**Pros:**

- Prevents recurrence
- Improves codebase consistency

**Cons:**

- Wider scope than demo-first ask
- Could surface many unrelated files

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected flows:**

- `/order-summary/:id`
- `/dashboard/orders/:id`

**Known affected files:**

- `/Users/vladislavcaraseli/Documents/Ecas/components/order-confirm/Details.vue`
- `/Users/vladislavcaraseli/Documents/Ecas/components/order-confirm/BackItems.vue`
- `/Users/vladislavcaraseli/Documents/Ecas/components/order-confirm/StackItems.vue`
- `/Users/vladislavcaraseli/Documents/Ecas/components/order-confirm/PaySummary.vue`

## Resources

- Browser evidence collected via `agent-browser` sessions `review_route1` and `review_route2`.

## Acceptance Criteria

- [x] `/order-summary/:id` renders without Nuxt error page
- [x] `/dashboard/orders/:id` renders without Nuxt error page
- [x] No `does not provide an export named 'BankInfo'` console/runtime error
- [x] All type-only imports in order-confirm stack use `import type`
- [x] Smoke check passes for `/order-summary/abc` and `/dashboard/orders/abc`

## Work Log

### 2026-02-18 - Review discovery

**By:** workflows-review run

**Actions:**

- Opened order detail routes with browser automation
- Captured runtime module export failure
- Traced crash to non-type import in order-confirm details stack

**Learnings:**

- A few remaining value imports of interfaces are still enough to hard-crash route init.

## Notes

- This is a merge/demo blocker (P1).
