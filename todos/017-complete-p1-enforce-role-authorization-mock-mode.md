---
status: complete
priority: p1
issue_id: '017'
tags: [code-review, security, authorization, mock-mode]
dependencies: []
---

# Enforce Role Authorization in Mock Mode

Customer users can access admin-only dashboard routes in mock mode.

## Problem Statement

Role authorization is bypassed entirely in mock mode, so any authenticated customer can open admin routes (`/dashboard/orders`, `/dashboard/customers`, etc.). This violates privileged area isolation and undermines the demo’s role-based access behavior.

## Findings

- `middleware/router.global.ts:7` returns early in mock mode and skips permission checks.
- With a customer token, `GET /dashboard/orders` returns HTTP `200` and renders admin page content (verified in runtime smoke check).
- `middleware/auth.ts:7` only checks cookie presence, so privileged route access relies only on a token string, not role permissions.

## Proposed Solutions

### Option 1: Re-enable `router.global` permission checks in mock mode

**Approach:** Remove or narrow the mock-mode bypass and run existing `UserPermissionsEnum` checks for all users.

**Pros:**

- Minimal code churn
- Reuses existing authorization logic
- Restores expected route-level behavior quickly

**Cons:**

- May surface missing permissions in mock user fixtures
- Could require permission adjustments in seed users

**Effort:** 1-2 hours

**Risk:** Medium

---

### Option 2: Add role guard into `middleware/auth.ts` for protected routes

**Approach:** Keep global middleware as-is, but enforce route-to-role mapping in `auth.ts`.

**Pros:**

- Isolated change in one middleware
- Explicit behavior for demo-critical routes

**Cons:**

- Duplicates permission rules
- Higher long-term maintenance burden

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**

- `middleware/router.global.ts:7`
- `middleware/auth.ts:7`
- `server/utils/mockUsers.ts:21`

## Resources

- Runtime verification used during review: customer token reached `/dashboard/orders` with HTTP 200.

## Acceptance Criteria

- [ ] Customer user is redirected away from admin routes in mock mode.
- [ ] Admin user can still access admin routes.
- [ ] Customer can still access `/dashboard/client`.
- [ ] No redirect loops are introduced.

## Work Log

### 2026-02-19 - Initial Discovery

**By:** Codex (workflows-review)

**Actions:**

- Reviewed middleware auth/authorization flow.
- Verified bypass in `router.global` mock-mode branch.
- Confirmed customer access to admin dashboard via runtime check.

**Learnings:**

- Mock-mode bypass currently disables all permission-based routing.

## Notes

- This is a merge-blocking authorization flaw for demo role isolation.
