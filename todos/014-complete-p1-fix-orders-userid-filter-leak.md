---
status: complete
priority: p1
issue_id: '014'
tags: [code-review, api, dashboard, data-integrity]
dependencies: []
---

# Fix Orders User Filter Leak

## Problem Statement

Customer-scoped order tables pass `userId`, but `/api/orders` still returns all orders. This leaks unrelated customer orders into profile flows and breaks the expected user/admin demo narrative.

## Findings

- `components/client-table/order/Index.vue:27` always sends `filters.userId` when the page is customer-scoped.
- `server/api/orders.get.ts:15` builds the dataset with `getDemoOrders(query.userId)`.
- `server/utils/mockDashboardDemo.ts:232` hardcodes every mapped order `user._id` to `normalizeUserId(userId)`, so `server/api/orders.get.ts:17` filter always passes for all rows.
- Repro:
  - `/api/orders?page=1&perPage=100` => `total_items = 30`
  - `/api/orders?page=1&perPage=100&userId=mock-user-1` => `total_items = 30`

## Proposed Solutions

### Option 1: Filter by customer mapping

**Approach:** In `server/api/orders.get.ts`, load base orders with `getDemoOrders()` (no user arg), resolve customer for requested user, then filter by customer identity (for example user email/customerId).

**Pros:**

- Minimal change in one API route.
- Keeps existing mock mapper mostly untouched.

**Cons:**

- Continues carrying mixed user/customer identity concepts.

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Fix mapper ownership model

**Approach:** Update `mapOrderToContract` so `order.user._id` is derived from the order's own customer relation, not the request query user.

**Pros:**

- Correct data model behavior across all consumers.
- Avoids similar filtering bugs elsewhere.

**Cons:**

- Requires careful pass over profile/order endpoints to keep compatibility.

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

Use Option 1 now for fast demo safety, then optionally normalize mapper semantics in a later cleanup.

## Technical Details

**Affected files:**

- `server/api/orders.get.ts`
- `server/utils/mockDashboardDemo.ts`
- `components/client-table/order/Index.vue`

## Resources

- Review session on branch `main` (local working tree)

## Acceptance Criteria

- [x] `/api/orders?userId=mock-user-1` returns only that customer’s orders.
- [x] Customer profile order table no longer shows unrelated orders.
- [x] Admin order table still returns full dataset when `userId` is absent.

## Work Log

### 2026-02-18 - Review Discovery

**By:** Codex

**Actions:**

- Traced `userId` from client table to `/api/orders`.
- Verified mapper/filter interaction in `mockDashboardDemo` and route handler.
- Reproduced with direct endpoint calls showing identical totals.

**Learnings:**

- Current mock mapping conflates "requested user" with each order row owner.

### 2026-02-18 - Fix Implemented

**By:** Codex

**Actions:**

- Updated `/api/orders` to use `getDemoOrdersForUser(userId)` when scoped.
- Removed ineffective row-level `user._id` filter dependency in route logic.
- Verified with live endpoint checks: `all=30`, `userId=mock-user-1 => 17`.
