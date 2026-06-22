---
status: complete
priority: p2
issue_id: '021'
tags: [code-review, checkout, ux, mock-mode]
dependencies: []
---

# Handle Cash Payment Display in Order Summary

Cash orders are processed, but payment display helper falls back to `N/A`.

## Problem Statement

Checkout now enables Cash as a valid method. The order summary helper has no Cash branch and falls through to default output (`type: Bank`, `text: N/A`), causing incorrect payment details in the UI.

## Findings

- `helpers/payment-info.helper.ts:8` switches on payment type.
- Cases exist for Card/Credit/Bank, but none for `PaymentTypeEnum.Cash`.
- `helpers/payment-info.helper.ts:46` default returns Bank + `N/A`, which is misleading for cash orders.

## Proposed Solutions

### Option 1: Add explicit cash case

**Approach:** Add `case PaymentTypeEnum.Cash` returning `{ type: PaymentTypeEnum.Cash, info: { text: 'Cash on delivery' } }`.

**Pros:**

- Minimal change
- Correct UI semantics for demo

**Cons:**

- None material

**Effort:** <1 hour

**Risk:** Low

---

### Option 2: Centralize payment labels in enum-to-label map

**Approach:** Replace switch with typed mapping for all payment methods.

**Pros:**

- Easier to maintain across new methods

**Cons:**

- Slightly larger refactor

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**

- `helpers/payment-info.helper.ts:8`
- `helpers/payment-info.helper.ts:46`

## Resources

- Manual code-path inspection during review.

## Acceptance Criteria

- [ ] Cash orders display a cash-specific payment label in order summary.
- [ ] Existing Card/Credit/Bank displays remain unchanged.
- [ ] No fallback `N/A` shown for supported payment methods.

## Work Log

### 2026-02-19 - Initial Discovery

**By:** Codex (workflows-review)

**Actions:**

- Reviewed payment display helper against enabled payment methods.

**Learnings:**

- Helper and settings are out of sync for Cash support.

## Notes

- Important UX/data-consistency issue for demo checkout.
