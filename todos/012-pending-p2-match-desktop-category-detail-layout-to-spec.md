---
status: pending
priority: p2
issue_id: '012'
tags: [code-review, frontend, ux, category-menu]
dependencies: []
---

# Match Desktop Category Detail Layout to Spec

## Problem Statement

The new desktop category panel hides the banner as requested, but the selected-category detail view is still structurally simpler than the provided target UI (missing richer multi-column taxonomy detail and footer utility/actions).

## Findings

- In `components/layout/header/main-menu/DektopPopoverContainer.vue:59-93`, selected state renders a single grid of direct children only.
- Reference UI expects hierarchical content density (deeper subcategory breakdown) and additional bottom utility row/partner blocks.
- Functional behavior is improved, but visual/IA parity is incomplete.

## Proposed Solutions

### Option 1: Implement full spec-aligned detail panel in current component

**Approach:** Extend selected panel with breadcrumb depth controls, multi-column child grouping, and footer actions.

**Pros:**

- Single component ownership.
- Direct path to visual parity.

**Cons:**

- Larger template complexity.

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Split selected-state panel into dedicated subcomponents

**Approach:** Extract breadcrumb bar, category-grid, and footer utility sections into focused components.

**Pros:**

- Better maintainability.
- Easier iteration/testing per section.

**Cons:**

- Slightly more refactor overhead.

**Effort:** Medium

**Risk:** Low

## Recommended Action

## Technical Details

Affected files:

- `/Users/vladislavcaraseli/Documents/Ecas/components/layout/header/main-menu/DektopPopoverContainer.vue:59`

## Resources

- Design reference screenshot provided in review thread.

## Acceptance Criteria

- [ ] Selected-category state visually matches approved desktop reference.
- [ ] Deeper taxonomy content (beyond one level) is represented clearly.
- [ ] Footer actions/utilities are present in selected state where required.
- [ ] Banner remains hidden once a category is selected.

## Work Log

### 2026-02-18 - Code Review Finding

**By:** Codex

**Actions:**

- Reviewed selected-state container implementation against requested target layout.
- Flagged structural mismatch as important follow-up.

**Learnings:**

- Behavior fix landed, but design parity requires a second pass.

## Notes

- Keep scoped to category panel only (no banner redesign).
