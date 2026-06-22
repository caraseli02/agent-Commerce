---
status: complete
priority: p3
issue_id: '026'
tags: [code-review, ux, routing]
dependencies: []
---

# Clarify `/cart` redirect behavior for unauthenticated users

## Problem Statement

`/cart` now exists and redirects to `/order-summary`. Since `/order-summary/**` is protected, unauthenticated users will be bounced by auth middleware (often back to home with `signin=true`). This is acceptable, but can feel confusing without explicit messaging.

## Findings

- Route file: `pages/cart.vue` redirects to `/order-summary`.
- Middleware protects `/order-summary/**` (per project routing rules), so unauth users likely end on home + sign-in prompt.

## Proposed Solutions

### Option 1: Redirect unauth users directly to sign-in prompt

**Approach:** In `pages/cart.vue`, detect auth and redirect to `/?signin=true` (or open sign-in modal) when not authenticated; otherwise redirect to `/order-summary`.

**Pros:**

- Clearer user intent

**Cons:**

- Slight extra branching

**Effort:** Small

**Risk:** Low

---

### Option 2: Add a short explanatory UI before redirect

**Approach:** Render a message (“Sign in to view your cart”) and then redirect.

**Pros:**

- Better UX

**Cons:**

- Still eventually redirects

**Effort:** Small

**Risk:** Low

## Recommended Action

To be filled during triage.

## Acceptance Criteria

- [ ] Unauthenticated `/cart` navigation has a clear outcome (sign-in prompt)
- [ ] Authenticated `/cart` navigation lands on an appropriate cart/order page

## Work Log

### 2026-02-22 - Initial Discovery

**By:** Codex

**Actions:**

- Observed `/cart` redirect flow and how it interacts with auth-protected `/order-summary/**`

### 2026-02-22 - Completed

**By:** Codex

**Actions:**

- Updated `pages/cart.vue` to redirect unauth users to `/?signin=true`
- Kept auth users redirecting to `/order-summary`
