---
status: complete
priority: p1
issue_id: '018'
tags: [code-review, security, authentication, mock-mode]
dependencies: []
---

# Require Authorization for Mock API Endpoints

Several sensitive mock endpoints are usable without any auth header.

## Problem Statement

In mock mode, missing/invalid authorization is silently mapped to the default customer user, allowing unauthenticated access to user data and order creation endpoints.

## Findings

- `server/utils/mockUsers.ts:186` defaults to `customerUser` when no user ID is provided.
- `server/utils/mockUsers.ts:208` and `server/utils/mockUsers.ts:213` propagate that default on missing/invalid bearer token.
- Unauthenticated requests currently succeed for:
- `GET /api/user/credit`
- `GET /api/user/cards`
- `POST /api/orders/new`
- Affected handlers include:
- `server/api/user/credit.get.ts:5`
- `server/api/user/cards.get.ts:6`
- `server/api/orders/new.post.ts:8`

## Proposed Solutions

### Option 1: Fail closed in token parser/helper

**Approach:** Make `getMockUserFromAuthHeader` return `null` when token is absent/invalid; callers reject with 401.

**Pros:**

- Centralized fix
- Eliminates accidental implicit auth
- Strongest security baseline

**Cons:**

- Requires null handling updates in all callers

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Keep helper behavior, validate per endpoint

**Approach:** Add explicit `Authorization` presence/token-shape checks in each endpoint.

**Pros:**

- Fine-grained control by endpoint

**Cons:**

- Easy to miss endpoints
- Repetition and drift risk

**Effort:** 3-5 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**

- `server/utils/mockUsers.ts:186`
- `server/utils/mockUsers.ts:208`
- `server/utils/mockUsers.ts:213`
- `server/api/orders/new.post.ts:8`
- `server/api/user/credit.get.ts:5`
- `server/api/user/cards.get.ts:6`

## Resources

- Runtime verification used during review: unauthenticated curl calls returned success payloads for the endpoints above.

## Acceptance Criteria

- [ ] Missing auth header returns HTTP 401 for protected mock endpoints.
- [ ] Invalid/malformed bearer token returns HTTP 401.
- [ ] Valid customer/admin tokens still work correctly.
- [ ] No endpoint defaults to a user when auth is absent.

## Work Log

### 2026-02-19 - Initial Discovery

**By:** Codex (workflows-review)

**Actions:**

- Traced auth flow in mock user helper and endpoint handlers.
- Executed unauthenticated endpoint checks and captured successful unauthorized responses.

**Learnings:**

- Current helper is open-by-default, which propagates insecure behavior across multiple APIs.

## Notes

- This is a merge blocker due to authentication bypass.
