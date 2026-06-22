---
status: complete
priority: p2
issue_id: '015'
tags: [code-review, api, dashboard, quality]
dependencies: []
---

# Fix Last 24h Order Filter Parsing

## Problem Statement

The "Last 24h" tab sends `startDate` in `DD/MM/YYYY HH:mm:ss`, while `/api/orders` parses with `new Date(query.startDate)`. That format is invalid in this runtime, so the filter is silently skipped.

## Findings

- `components/admin-table/order/Order.vue:63` formats `startDate` as `DD/MM/YYYY HH:mm:ss`.
- `server/api/orders.get.ts:33` uses `new Date(query.startDate)` and only filters if parse succeeds.
- Repro:
  - `/api/orders?...&startDate=2026-02-17T00:00:00.000Z` => filtered result (`0` with current mock dates).
  - `/api/orders?...&startDate=17/02/2026 00:00:00` => unfiltered result (`30`).

## Proposed Solutions

### Option 1: Send ISO date from UI

**Approach:** Change filter generation to `moment.utc().subtract(24, 'hours').toISOString()`.

**Pros:**

- Smallest and safest fix.
- Keeps API parser simple.

**Cons:**

- Relies on every caller sending ISO.

**Effort:** < 1 hour

**Risk:** Low

---

### Option 2: Accept both formats in API

**Approach:** Add explicit parser fallback for `DD/MM/YYYY HH:mm:ss`.

**Pros:**

- More resilient API for multiple callers.

**Cons:**

- Adds format-guessing logic in backend.

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

Apply Option 1 now (demo-first), optionally keep Option 2 as hardening if needed.

## Technical Details

**Affected files:**

- `components/admin-table/order/Order.vue`
- `server/api/orders.get.ts`

## Resources

- Review session on branch `main` (local working tree)

## Acceptance Criteria

- [x] "Last 24h" tab passes ISO `startDate`.
- [x] `/api/orders` applies date filtering for this tab.
- [x] Tab count differs from "All orders" when dataset makes it applicable.

## Work Log

### 2026-02-18 - Review Discovery

**By:** Codex

**Actions:**

- Cross-checked tab filter payload and API parser behavior.
- Reproduced mismatch via direct endpoint calls.

**Learnings:**

- Date format drift between frontend and API silently breaks filtering.

### 2026-02-18 - Fix Implemented

**By:** Codex

**Actions:**

- Added tab-level filter builder to send `startDate` correctly and consistently.
- Wired tab changes to trigger server fetch with computed filters.
- Added API fallback parser for `DD/MM/YYYY HH:mm:ss` for backward compatibility.
- Verified both ISO and legacy `startDate` now parse and filter consistently.
