---
status: pending
priority: p2
issue_id: '028'
tags: [code-review, auth, ux, nuxt]
dependencies: []
---

# Clear stale login redirect query on modal close

Remove or consume `redirect` when the sign-in modal is dismissed without authentication.

## Problem Statement

The new `redirect` query is preserved when the account modal closes. If a user is sent to `/?signin=true&redirect=/cart`, closes the modal, and later signs in from the homepage, the stale `/cart` redirect can still be applied unexpectedly.

This causes confusing navigation and makes the redirect intent persist longer than the original flow.

## Findings

- `components/layout/header/MainRow.vue:251` only removes `signin` from the query on modal close.
- `components/layout/header/MainRow.vue:252` preserves all remaining params, including `redirect`.
- `pages/index.vue:23` and `pages/index.vue:24` also strip only `signin` on mount, leaving `redirect`.
- `components/layout/account-modal/Form.vue:290` later consumes `route.query.redirect` during any sign-in.

## Proposed Solutions

### Option 1: Remove `redirect` when closing sign-in modal

**Approach:** Update close handlers to strip both `signin` and `redirect` if the modal was opened via sign-in query.

**Pros:**

- Minimal change
- Matches user intent for dismissed flow
- Prevents surprise redirects

**Cons:**

- Need to ensure successful sign-in path still preserves redirect until submit

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 2: Consume redirect immediately after modal opens

**Approach:** Move redirect value into local state/store, then clear the query from the URL.

**Pros:**

- Cleaner URL
- Prevents stale query persistence

**Cons:**

- More state coordination between header and modal form
- Slightly larger refactor

**Effort:** 1-2 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**

- `components/layout/header/MainRow.vue:248`
- `components/layout/header/MainRow.vue:251`
- `pages/index.vue:23`
- `components/layout/account-modal/Form.vue:290`

**Related components:**

- `pages/cart.vue` (sets `redirect=/cart`)

**Database changes (if any):**

- Migration needed? No

## Resources

- **Review target:** local uncommitted changes on `main` (2026-02-25)

## Acceptance Criteria

- [ ] Dismissing the sign-in modal clears stale `redirect` intent
- [ ] Signing in immediately after redirecting from `/cart` still returns to `/cart`
- [ ] Manual sign-in from homepage without redirect query follows normal role-based destination
- [ ] URL query cleanup remains stable (no loops/flicker)

## Work Log

### 2026-02-25 - Review finding capture

**By:** Codex

**Actions:**

- Traced query lifecycle across `pages/cart.vue`, `pages/index.vue`, and header modal handlers
- Verified `redirect` survives modal dismissal and page query cleanup
- Documented user-visible stale redirect scenario

**Learnings:**

- Query cleanup currently treats `signin` as ephemeral but leaves `redirect` sticky.
