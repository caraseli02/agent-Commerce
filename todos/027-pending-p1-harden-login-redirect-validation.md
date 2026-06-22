---
status: pending
priority: p1
issue_id: '027'
tags: [code-review, security, auth, nuxt]
dependencies: []
---

# Harden post-login redirect validation

Tighten validation of the `redirect` query parameter before calling `navigateTo()` after sign-in.

## Problem Statement

The new post-login redirect support accepts any string that starts with `/`. This also accepts protocol-relative values like `//attacker.example`, which can become an external redirect target after successful authentication.

This creates an open-redirect risk in the login flow.

## Findings

- `components/layout/account-modal/Form.vue:290` reads `route.query.redirect`.
- `components/layout/account-modal/Form.vue:291` only checks `startsWith('/')`.
- Values like `//example.com` pass that check.
- `components/layout/account-modal/Form.vue:292` forwards the value into `navigateTo(...)`.
- The change is newly introduced with the cart redirect flow update.

## Proposed Solutions

### Option 1: Strict path-only allowlist

**Approach:** Accept only relative app paths that start with a single `/`, reject `//`, and optionally require a route-prefix allowlist.

**Pros:**

- Blocks protocol-relative redirects
- Simple and low-risk fix
- Easy to test

**Cons:**

- Needs a small helper and tests
- May reject some previously tolerated formats

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 2: Resolve redirect via router route names

**Approach:** Map supported redirects to internal route names/keys instead of trusting raw query strings.

**Pros:**

- Strongest control over destinations
- Easier to audit allowed targets

**Cons:**

- More refactor work
- Less flexible for future deep links

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 3: Drop query-based redirect and use store/session state

**Approach:** Persist intended destination in local state/session and ignore URL parameter entirely.

**Pros:**

- Removes URL tampering vector
- Keeps redirects internal by construction

**Cons:**

- More moving parts
- Requires updating entry points that trigger sign-in

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**

- `components/layout/account-modal/Form.vue:290`
- `components/layout/account-modal/Form.vue:291`
- `components/layout/account-modal/Form.vue:292`

**Related components:**

- `pages/cart.vue` (source of `redirect` query)
- `components/layout/header/MainRow.vue` (sign-in modal query lifecycle)

**Database changes (if any):**

- Migration needed? No

## Resources

- **Review target:** local uncommitted changes on `main` (2026-02-25)

## Acceptance Criteria

- [ ] Redirect validation rejects `//host`, `http://...`, and other external forms
- [ ] Internal redirects like `/cart` continue to work
- [ ] Login still falls back to role-based redirect when `redirect` is invalid
- [ ] Regression check covers both mock and non-mock sign-in paths

## Work Log

### 2026-02-25 - Review finding capture

**By:** Codex

**Actions:**

- Reviewed new login redirect logic in `components/layout/account-modal/Form.vue`
- Confirmed validation only checks `startsWith('/')`
- Identified protocol-relative open-redirect acceptance case (`//...`)
- Documented remediation options

**Learnings:**

- The cart redirect feature is useful, but it needs stricter destination validation.

## Notes

- Suggested minimal guard: `redirect.startsWith('/') && !redirect.startsWith('//')`.
