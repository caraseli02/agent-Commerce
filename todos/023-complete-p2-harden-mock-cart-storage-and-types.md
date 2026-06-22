---
status: complete
priority: p2
issue_id: '023'
tags: [code-review, nitro, mock, reliability, typescript]
dependencies: []
---

# Harden mock cart storage and typing

## Problem Statement

Mock cart state is stored in a process-wide `Map` keyed by userId. This is fine for demos, but it can:

- grow unbounded in long-lived processes,
- make debugging harder (stale state),
- rely on `any` typing in pricing computation.

## Findings

- In-memory cart store: `server/utils/mockCart.ts`
- No TTL / eviction; carts accumulate per user id.
- Pricing function uses `any` for product entity and history access.

## Proposed Solutions

### Option 1: Add TTL-based eviction

**Approach:** Store `updatedAt` per cart and periodically evict old carts (e.g. 30–60 minutes) or cap map size.

**Pros:**

- Prevents unbounded growth
- Keeps demo behavior stable over time

**Cons:**

- Slightly more code

**Effort:** Small

**Risk:** Low

---

### Option 2: Move mock cart to cookie/session scoped storage

**Approach:** Serialize cart into an encrypted cookie (or session) so state is per-browser instead of per-process.

**Pros:**

- No server memory growth

**Cons:**

- Cookie size limits
- More complexity

**Effort:** Medium

**Risk:** Medium

---

### Option 3: Keep Map, but hard-cap size

**Approach:** If `Map.size > N`, delete oldest entries (simple LRU).

**Pros:**

- Very simple

**Cons:**

- Eviction can be surprising

**Effort:** Small

**Risk:** Low/Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**

- `server/utils/mockCart.ts`

## Acceptance Criteria

- [ ] Mock cart storage cannot grow without bound
- [ ] Demo flows remain stable across repeated logins/users
- [ ] Types are improved (avoid `any` where straightforward)

## Work Log

### 2026-02-22 - Initial Discovery

**By:** Codex

**Actions:**

- Reviewed `server/utils/mockCart.ts` for reliability and typing risks

**Learnings:**

- In-memory demo state needs guardrails for long-running dev servers

### 2026-02-22 - Completed

**By:** Codex

**Actions:**

- Added TTL eviction + max-size cap to mock cart store
- Improved pricing typing (avoid `any`) in `server/utils/mockCart.ts`
