---
status: complete
priority: p2
issue_id: '016'
tags: [code-review, dashboard, control-panel, quality]
dependencies: []
---

# Fix Organization Address Edit Guards

## Problem Statement

Address update handlers in control-panel shipping/billing return early when `accountType` is truthy. Organization accounts (`accountType = 2`) therefore cannot persist edits/default changes.

## Findings

- `components/dashboard/control-panel/ShippingView.vue:156` blocks `setAsDefault` when `props.accountType` is truthy.
- `components/dashboard/control-panel/ShippingView.vue:253` blocks `handleEditAddress` under the same condition.
- `components/dashboard/control-panel/BillingView.vue:253` does the same for billing edits.
- This creates no-op behavior for non-personal flows even when endpoints are available.

## Proposed Solutions

### Option 1: Use null/undefined checks only

**Approach:** Replace truthy guard with explicit absence checks:
`props.accountType === null || typeof props.accountType === 'undefined'`.

**Pros:**

- Minimal patch aligned with nearby guards already used in these files.
- Restores organization flow persistence.

**Cons:**

- Keeps duplicated guard logic.

**Effort:** < 1 hour

**Risk:** Low

---

### Option 2: Extract shared guard helper

**Approach:** Add local helper like `hasValidAccountContext()` and use across shipping/billing handlers.

**Pros:**

- Reduces future inconsistency.
- Easier to reason about flow gating.

**Cons:**

- Slightly larger change set.

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

Implement Option 1 now for immediate demo stability.

## Technical Details

**Affected files:**

- `components/dashboard/control-panel/ShippingView.vue`
- `components/dashboard/control-panel/BillingView.vue`

## Resources

- Review session on branch `main` (local working tree)

## Acceptance Criteria

- [x] Organization account address edits call update endpoints.
- [x] Organization "set as default" action persists.
- [x] Personal account behavior remains unchanged.

## Work Log

### 2026-02-18 - Review Discovery

**By:** Codex

**Actions:**

- Reviewed shipping/billing action guards after mock endpoint additions.
- Traced branch conditions that short-circuit non-personal account flows.

**Learnings:**

- Boolean guard style drift introduced account-type specific regressions.

### 2026-02-18 - Fix Implemented

**By:** Codex

**Actions:**

- Replaced truthy `accountType` guards with explicit null/undefined checks in shipping/billing edit paths.
- Verified guards now allow organization accounts while still protecting missing context.
