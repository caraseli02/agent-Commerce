---
status: completed
priority: p2
issue_id: '010'
tags: [code-review, ssr, hydration, ui, header]
dependencies: []
---

# Resolve Home Hydration Mismatch Warnings

## Problem Statement

Homepage SSR/client hydration currently logs repeated mismatch warnings (`Hydration node mismatch`, `Hydration children mismatch`). Even when the page appears usable, these mismatches can cause subtle interactivity bugs and reduce demo reliability.

## Findings

- Reproduced on homepage (`/`) via browser console.
- Observed warnings include:
  - `Hydration completed but contains mismatches`
  - `Hydration children mismatch`
  - `Hydration node mismatch`
- Stack traces repeatedly reference header/main layout components and notification sheet render paths:
  - `/Users/vladislavcaraseli/Documents/Ecas/components/layout/header/MainRow.vue`
  - `/Users/vladislavcaraseli/Documents/Ecas/components/layout/header/main-menu/Items.vue`
  - notification/dialog mounts under header

## Proposed Solutions

### Option 1: Stabilize SSR render tree in header (recommended)

**Approach:** Ensure server/client render identical structure by gating browser-only branches (`window`, breakpoints, portals) behind client-safe wrappers and deterministic defaults.

**Pros:**

- Fixes root mismatch class
- Improves UI consistency

**Cons:**

- Requires careful header/dialog review

**Effort:** 1-3 hours

**Risk:** Medium

---

### Option 2: Wrap problematic fragments with `ClientOnly`

**Approach:** Move notification/dialog and viewport-dependent UI to `ClientOnly` wrappers.

**Pros:**

- Fast mitigation

**Cons:**

- Reduced SSR content
- Can hide deeper state/render issues

**Effort:** 30-90 minutes

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Likely hotspots:**

- Header navigation component switching and menu states
- Notification sheet/dialog portal rendering
- Any viewport/breakpoint branching that diverges server vs client

## Resources

- Browser console evidence from review session `rv_home`.

## Acceptance Criteria

- [x] Homepage loads with no hydration mismatch warnings in console
- [x] Header menu and notification interactions still function after fix
- [x] No SSR/client DOM divergence warnings for main layout

## Work Log

### 2026-02-18 - Review discovery

**By:** workflows-review run

**Actions:**

- Captured homepage console logs after load
- Isolated consistent hydration mismatch warning pattern
- Mapped warnings to header/main layout and notification stack

**Learnings:**

- Current behavior is non-blocking but fragile; could regress into visible UI bugs.

## Notes

- Marked P2 since app remains navigable, but reliability/perceived quality impact is significant for portfolio demo.
