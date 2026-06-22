---
status: completed
priority: p2
issue_id: '009'
tags: [code-review, typescript, runtime, reliability]
dependencies: []
---

# Audit Remaining Runtime Type Imports

## Problem Statement

The current branch still contains multiple imports where interface/type symbols appear to be imported as runtime values from `~/types` barrels. This pattern already caused several hard route crashes and is likely still latent in untested flows.

## Findings

- Static scan shows remaining suspicious imports, for example:
  - `/Users/vladislavcaraseli/Documents/Ecas/components/order-confirm/BackItems.vue:3`
  - `/Users/vladislavcaraseli/Documents/Ecas/components/order-confirm/StackItems.vue:4`
  - `/Users/vladislavcaraseli/Documents/Ecas/components/order-confirm/PaySummary.vue:3`
  - `/Users/vladislavcaraseli/Documents/Ecas/components/dashboard/client/PaymentCard.vue:56`
  - `/Users/vladislavcaraseli/Documents/Ecas/components/dashboard/client/settings/Payments.vue:4`
  - `/Users/vladislavcaraseli/Documents/Ecas/components/dashboard/client/settings/PaymentsDialog.vue:7`
  - `/Users/vladislavcaraseli/Documents/Ecas/components/dashboard/client/settings/CardsList.vue:27`
- This risk is proven by already reproduced crashes from the same class (`BankInfo`, `PaymentStatusOption`).

## Proposed Solutions

### Option 1: Grep-driven targeted sweep (recommended)

**Approach:** Use grep list to convert all obvious interface-like symbols in touched demo modules to `import type`, then re-smoke key routes.

**Pros:**

- Fast and pragmatic for demo readiness
- Reduces follow-up crash churn

**Cons:**

- Relies on naming heuristics

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Full repo codemod for type-only imports

**Approach:** Run codemod/lint autofix to enforce type-only imports across all files.

**Pros:**

- Maximum consistency

**Cons:**

- Very large diff in dirty branch
- Higher chance of noisy conflicts

**Effort:** 3-6 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Pattern to eliminate:**

- `import { SomeInterface } from '~/types'`
- when `SomeInterface` is not a runtime export

**Verification target routes after sweep:**

- `/order-summary/:id`
- `/dashboard/orders/:id`
- `/dashboard/customers/:slug/control-panel/account`
- `/dashboard/settings`

## Resources

- Static scan commands executed during review:
  - `rg` queries against `components/`, `pages/`, `composables/`, `services/`, `store/`.

## Acceptance Criteria

- [x] No remaining obvious interface/value imports in touched demo modules
- [x] Route smoke tests pass for key dashboard/order flows
- [x] No new `does not provide an export named ...` runtime errors in those routes

## Work Log

### 2026-02-18 - Review discovery

**By:** workflows-review run

**Actions:**

- Ran static scans for runtime imports of interface-like symbols
- Cross-checked with observed runtime crashes
- Collected representative affected files

**Learnings:**

- The codebase currently has a systemic pattern that can regress quickly without a targeted sweep.

## Notes

- Priority set to P2 because some key routes already work, but risk remains high in untested paths.
