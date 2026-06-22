---
status: pending
priority: p2
issue_id: '029'
tags: [code-review, auth, demo-mode, ux]
dependencies: []
---

# Restore signup entry in non-mock mode

Gate the "Signup is disabled in the demo" message behind mock mode and preserve the signup link for normal mode.

## Problem Statement

The sign-up CTA in the account modal was replaced with a demo-only message unconditionally. In non-mock environments, users no longer have a sign-up entry point and instead see incorrect copy saying signup is disabled.

This is a functional regression outside demo mode.

## Findings

- `components/layout/account-modal/Form.vue:75` renders the demo-only message without a mock-mode condition.
- The previous `NuxtLink` to `/signup` was removed entirely in this patch.
- Google login and divider were correctly gated with `v-if="!config.public.MOCK_MODE"`, which indicates the signup message likely intended the same treatment.

## Proposed Solutions

### Option 1: Conditional render (demo message vs signup link)

**Approach:** Render the demo message only in mock mode; restore the original signup link otherwise.

**Pros:**

- Preserves demo UX and production behavior
- Small targeted change

**Cons:**

- Requires keeping both UI variants maintained

**Effort:** 15-30 minutes

**Risk:** Low

---

### Option 2: Feature-flag signup availability explicitly

**Approach:** Introduce a dedicated config flag (for example `SIGNUP_ENABLED`) rather than inferring from `MOCK_MODE`.

**Pros:**

- More explicit behavior control
- Flexible for staging/demo environments

**Cons:**

- More config surface area
- Slightly larger change

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**

- `components/layout/account-modal/Form.vue:75`
- `components/layout/account-modal/Form.vue:76`

**Related components:**

- `components/layout/account-modal/Index.vue` (demo-specific modal copy)

**Database changes (if any):**

- Migration needed? No

## Resources

- **Review target:** local uncommitted changes on `main` (2026-02-25)

## Acceptance Criteria

- [ ] In mock mode, the modal shows demo-specific signup-disabled copy
- [ ] In non-mock mode, the `/signup` link is visible again
- [ ] Copy and available auth options are consistent with mode (mock vs non-mock)

## Work Log

### 2026-02-25 - Review finding capture

**By:** Codex

**Actions:**

- Compared account modal auth CTA changes in `Form.vue`
- Verified mock-mode guards exist for Google sign-in but not for signup copy
- Captured regression and remediation options

**Learnings:**

- Demo-mode UX changes need consistent gating to avoid impacting production behavior.
