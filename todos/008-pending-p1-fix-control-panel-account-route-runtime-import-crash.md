---
status: completed
priority: p1
issue_id: '008'
tags: [code-review, runtime, typescript, dashboard, control-panel]
dependencies: []
---

# Fix Control Panel Account Route Runtime Import Crash

## Problem Statement

`/dashboard/customers/:slug/control-panel/account` crashes with a module export error due to interface imports treated as runtime values.

This breaks the customer control-panel account flow in the demo.

## Findings

- Reproduced crash route:
  - `http://localhost:3000/dashboard/customers/demo/control-panel/account`
- Console/runtime error:
  - `does not provide an export named 'PaymentStatusOption'`
- Source file:
  - `/Users/vladislavcaraseli/Documents/Ecas/components/client-table/transaction/options.ts:1`
  - `PaymentStatusOption` and `PaymentTypeOption` are imported as runtime values from `/Users/vladislavcaraseli/Documents/Ecas/types/order-summary/item.ts`

## Proposed Solutions

### Option 1: Minimal targeted fix

**Approach:** Convert `PaymentStatusOption` and `PaymentTypeOption` to `import type` in transaction options.

**Pros:**

- Fast unblock
- Tiny safe change

**Cons:**

- Only addresses this specific import site

**Effort:** 10-20 minutes

**Risk:** Low

---

### Option 2: Audit transaction table module imports

**Approach:** Review `components/client-table/transaction/**` and related consumers for any remaining value/type import mistakes.

**Pros:**

- Prevents the next similar route crash in same module

**Cons:**

- Slightly larger scope than minimum

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 3: Module-level shared type export cleanup

**Approach:** Split runtime enums/helpers and interfaces into explicit files (`*.types.ts`) and import accordingly.

**Pros:**

- Clear long-term structure

**Cons:**

- Overkill for demo timing

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Primary file:**

- `/Users/vladislavcaraseli/Documents/Ecas/components/client-table/transaction/options.ts`

**Related types:**

- `/Users/vladislavcaraseli/Documents/Ecas/types/order-summary/item.ts`

## Resources

- Browser evidence collected via `agent-browser` session `rv2_dashboard_customers_demo_control-panel_account`.

## Acceptance Criteria

- [x] `/dashboard/customers/demo/control-panel/account` no longer crashes
- [x] No `PaymentStatusOption` export error in console
- [x] Transaction options file uses `import type` for interface symbols
- [x] Customer control-panel account view is navigable in demo mode

## Work Log

### 2026-02-18 - Review discovery

**By:** workflows-review run

**Actions:**

- Executed route sweep across customer dashboard routes
- Isolated crashing route and traced module export error
- Located offending import site in transaction options

**Learnings:**

- One missed interface import is enough to take down a nested dashboard route.

## Notes

- This is a demo flow blocker (P1).
