---
status: pending
priority: p2
issue_id: '013'
tags: [code-review, frontend, layout, responsiveness]
dependencies: []
---

# Replace Hardcoded Desktop Popover Offsets

## Problem Statement

Desktop popover positioning uses hardcoded fixed `top` offsets tied to `isScrolled`, which is brittle across header-height changes, responsive breakpoints, and future nav updates.

## Findings

- `components/layout/header/main-menu/DesktopPopover.vue:31` uses `fixed` + `top-[98px]` / `top-[153px]`.
- Any header spacing/font/announcement-bar change can desync popover alignment.
- This increases maintenance cost and can cause overlap/gap regressions.

## Proposed Solutions

### Option 1: Anchor popover to measured trigger/header bounds

**Approach:** Use trigger `getBoundingClientRect()` (or shared header height CSS var) to compute dynamic top.

**Pros:**

- Accurate across breakpoints.
- Resilient to header changes.

**Cons:**

- Requires reactive measurement wiring.

**Effort:** Small-Medium

**Risk:** Low

---

### Option 2: Keep absolute positioning inside a stable header container

**Approach:** Render popover absolutely relative to header row wrapper instead of viewport-fixed math.

**Pros:**

- Simpler CSS model.
- Fewer JS calculations.

**Cons:**

- Depends on parent stacking/overflow constraints.

**Effort:** Small

**Risk:** Medium

## Recommended Action

## Technical Details

Affected files:

- `/Users/vladislavcaraseli/Documents/Ecas/components/layout/header/main-menu/DesktopPopover.vue:31`

## Resources

- Review context: current desktop category/menu regression fixes.

## Acceptance Criteria

- [ ] Popover top alignment remains correct for scrolled/unscrolled states.
- [ ] No hardcoded pixel offsets tied to current header height.
- [ ] Verified at desktop breakpoints (`lg`, `xl`, `2xl`).

## Work Log

### 2026-02-18 - Code Review Finding

**By:** Codex

**Actions:**

- Inspected popover positioning implementation and identified hardcoded viewport offsets.

**Learnings:**

- Dynamic anchoring is needed to prevent future layout drift.

## Notes

- Treat as layout reliability fix, not visual polish only.
