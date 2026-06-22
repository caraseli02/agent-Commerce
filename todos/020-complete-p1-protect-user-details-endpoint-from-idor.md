---
status: complete
priority: p1
issue_id: '020'
tags: [code-review, security, authorization, idor]
dependencies: ['018']
---

# Protect User Details Endpoint from IDOR

`GET /api/user/[userId]/details` returns user profiles for arbitrary IDs without auth validation.

## Problem Statement

The endpoint trusts a path parameter and returns full user records without checking caller authentication or ownership. Attackers can request admin/customer records by ID and exfiltrate personal/business data.

## Findings

- `server/api/user/[userId]/details.get.ts:4` reads `userId` directly from route params.
- `server/api/user/[userId]/details.get.ts:5` calls `getMockUserById(userId)` and returns it.
- Runtime verification: unauthenticated request to `/api/user/mock-admin-1/details` returned success payload with admin profile data.

## Proposed Solutions

### Option 1: Authenticate caller and enforce self-only access

**Approach:** Require valid bearer token, derive caller userId from token, and allow details only for same userId unless caller has admin permission.

**Pros:**

- Correct authorization model
- Prevents direct object reference abuse

**Cons:**

- Requires permission check wiring in handler

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Ignore path userId for non-admin callers

**Approach:** Resolve user exclusively from auth header and return that user; only admins may query by arbitrary userId.

**Pros:**

- Simpler behavior for customer demo flows

**Cons:**

- Less flexible API contract

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**

- `server/api/user/[userId]/details.get.ts:4`
- `server/api/user/[userId]/details.get.ts:5`
- `server/utils/mockUsers.ts:186`

## Resources

- Runtime verification during review on 2026-02-19.

## Acceptance Criteria

- [ ] Endpoint returns HTTP 401 when auth header is missing/invalid.
- [ ] Customer token cannot fetch another user’s details.
- [ ] Admin token can fetch other users only if explicitly allowed.
- [ ] Existing login flow still resolves current user details correctly.

## Work Log

### 2026-02-19 - Initial Discovery

**By:** Codex (workflows-review)

**Actions:**

- Inspected user details endpoint implementation.
- Verified unauthenticated admin profile fetch.

**Learnings:**

- Current implementation is vulnerable to direct object reference abuse.

## Notes

- Merge-blocking data exposure issue.
