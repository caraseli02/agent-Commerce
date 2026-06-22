---
status: complete
priority: p1
issue_id: '019'
tags: [code-review, security, authentication, authorization]
dependencies: ['017']
---

# Block Protected Routes with Fake Token Cookie

Protected dashboard routes can be opened with an arbitrary `token` cookie value.

## Problem Statement

Route protection currently treats any non-empty `token` cookie as authenticated. This allows unauthenticated users to bypass login by setting `token=anything`, then opening privileged pages.

## Findings

- `middleware/auth.ts:7` only checks `Boolean(token?.value)` and does not validate token structure/session/user.
- `middleware/router.global.ts:19` returns early when `loggedInUser` is missing, so no permission check runs.
- Runtime verification:
- `GET /dashboard/orders` with no cookie returns `302` to `/?signin=true`.
- `GET /dashboard/orders` with `Cookie: token=not-a-real-token` returns `200` and renders page content.

## Proposed Solutions

### Option 1: Require both token and resolved logged-in user in auth middleware

**Approach:** In `auth.ts`, if token is present but `authStore.loggedInUser` is absent, clear session and redirect to `/?signin=true`.

**Pros:**

- Small change
- Stops bypass immediately
- Aligns route access with actual login state

**Cons:**

- Requires reliable user hydration after valid login

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Validate mock token signature/format in middleware

**Approach:** Parse mock token format (`demo-token::userId::ts`) and reject malformed values before allowing route access.

**Pros:**

- Stronger gate even before store hydration

**Cons:**

- Extra coupling to mock token format
- Still needs user existence/permission checks

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**

- `middleware/auth.ts:7`
- `middleware/router.global.ts:19`

## Resources

- Runtime verification during review on 2026-02-19 (`NITRO_PORT=3106`).

## Acceptance Criteria

- [ ] Arbitrary `token` cookie no longer grants access to `/dashboard/**` routes.
- [ ] Logged-out users always redirect to `/?signin=true` for protected routes.
- [ ] Valid logged-in sessions remain functional.
- [ ] No redirect loops are introduced.

## Work Log

### 2026-02-19 - Initial Discovery

**By:** Codex (workflows-review)

**Actions:**

- Reproduced protected-route access with fake cookie.
- Traced bypass to auth middleware + global middleware interaction.

**Learnings:**

- Protected-route gate currently validates cookie existence, not auth state.

## Notes

- Merge-blocking authentication bypass.
