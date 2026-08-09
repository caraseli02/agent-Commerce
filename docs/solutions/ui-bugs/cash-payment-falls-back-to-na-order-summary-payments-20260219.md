---
module: Payments
date: 2026-02-19
problem_type: ui_bug
component: payments
symptoms:
  - 'Checkout with Cash succeeded, but order summary showed payment text as N/A'
  - 'Cash orders were rendered as Bank fallback in payment info output'
  - 'Demo checkout looked incomplete despite successful order placement'
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags: [payments, checkout, order-summary, cash, payment-type-enum, nuxt3]
---

# Troubleshooting: Cash Payment Rendered as N/A in Order Summary

## Problem

Cash payment was enabled in demo settings and checkout completed successfully, but the order summary displayed `N/A` (bank fallback) instead of a cash-specific payment label.

## Environment

- Module: Payments / Order Summary
- Affected Component:
  - `/path/to/components-marketplace/helpers/payment-info.helper.ts`
- Date: 2026-02-19

## Symptoms

- User selected Cash as payment type and placed an order successfully.
- Order summary payment block did not show cash information.
- UI fell through to default output with `type: PaymentTypeEnum.Bank` and `text: 'N/A'`.

## What Didn't Work

**Attempted Solution 1:** Enabling Cash in payment method configuration only.

- **Why it failed:** Configuration made Cash selectable, but display mapping logic still had no `Cash` branch.

**Direct solution:** The issue was fixed by adding explicit handling for `PaymentTypeEnum.Cash` in the payment info helper.

## Solution

Added a dedicated `Cash` case in the payment info switch.

**Code changes:**

```ts
// /path/to/components-marketplace/helpers/payment-info.helper.ts
case PaymentTypeEnum.Cash: {
  return {
    type: PaymentTypeEnum.Cash,
    info: {
      text: 'Cash on delivery',
    },
  };
}
```

## Why This Works

1. The root cause was missing branch logic, not data availability.
2. The helper now maps all supported payment enums (Card, Credit, Bank, Cash).
3. Cash orders no longer fall through to the default fallback block.

## Verification

- Placed checkout order with Cash in mock mode.
- Confirmed order summary uses cash-specific label instead of `N/A`.
- Confirmed other payment types continue to render as before.

## Prevention

- When adding/enabling a new payment enum, update all enum switch consumers (UI render helpers, summaries, badges).
- Add a regression check that iterates all enabled payment types and validates summary text output.
- Prefer exhaustive enum handling patterns to catch missing branches during review.

## Related Issues

- `/path/to/components-marketplace/todos/021-complete-p2-handle-cash-payment-display-in-order-summary.md`
