---
module: System
date: 2026-02-18
problem_type: ui_bug
component: rails_view
symptoms:
  - 'Desktop category menu showed incorrect hero/banner layout and category panel did not match approved UI'
  - 'After category interaction, right panel behavior was inconsistent (banner visibility and category detail state)'
  - 'Popover alignment was brittle due to fixed hardcoded top offsets'
root_cause: config_error
resolution_type: code_fix
severity: high
tags: [nuxt3, ui-bug, desktop-menu, category-navigation, popover-positioning]
---

# Troubleshooting: Desktop Category Menu UI Regression (Banner + Detail Panel)

## Problem

The desktop `Products` popover UI diverged from the approved category/menu design. The banner and category detail behaviors were mixed, resulting in incorrect right-panel presentation and inconsistent category drilldown state.

## Environment

- Module: Header / Main Menu (desktop)
- Affected Components:
  - `/path/to/components-marketplace/components/layout/header/main-menu/DektopPopoverContainer.vue`
  - `/path/to/components-marketplace/components/layout/header/main-menu/DesktopPopover.vue`
  - `/path/to/components-marketplace/composables/useCategoriesNavigation.ts`
- Date: 2026-02-18

## Symptoms

- Initial menu state did not reliably match expected structure.
- Banner visibility/state handling during category selection was not consistent with requirements.
- Category detail panel lacked expected hierarchy/utility affordances.
- Popover could visually drift due to hardcoded `top` values tied to header state.

## What Didn't Work

**Attempted Solution 1:** Rework only banner internals (carousel/arrow layout).

- **Why it failed:** It addressed one visual symptom but not the user requirement to keep banner default and switch to category detail panel on category selection.

**Attempted Solution 2:** Keep fixed popover offsets (`top-[98px]` / `top-[153px]`).

- **Why it failed:** Hardcoded viewport offsets are fragile across header height and breakpoint changes.

## Solution

Implemented category-first interaction model while restoring banner file behavior.

### 1) Restore banner component baseline

- Reverted banner custom redesign so banner behavior/styling returned to component baseline.

### 2) Make category selection own the right panel state

- In `DektopPopoverContainer.vue`:
  - Added `hasSelection` gate.
  - `v-if="!hasSelection"` renders banner.
  - `v-else` renders selected-category detail panel (breadcrumb, hierarchical entries, utility footer).
  - Added explicit reset (`All Categories`) to return to banner state.

### 3) Stabilize navigation state in composable

- In `useCategoriesNavigation.ts`:
  - Kept menu state in Nuxt `useState` for consistent shared behavior.
  - Hardened subcategory checks with `Array.isArray(category?.subcategory)` to avoid undefined-path failures.

### 4) Replace hardcoded popover top with measured positioning

- In `DesktopPopover.vue`:
  - Added `wrapperRef` + `getBoundingClientRect()` measurement.
  - Derived top dynamically (`rect.bottom + 15`) on open/resize/scroll.
  - Removed dependence on hardcoded pixel offsets.

## Why This Works

1. Right panel now has deterministic ownership: banner only when no category is selected, detail panel when a category is selected.
2. Navigation state is robust across component boundaries due to shared state keys.
3. Measured popover top follows real header geometry and avoids brittle magic numbers.
4. UI now follows the requested interaction contract: category click transitions away from banner to category detail.

## Verification

- Manual browser verification performed with `agent-browser`:
  - Open `Products` popover (desktop).
  - Confirm banner visible in default state.
  - Click category and verify banner disappears; detail panel appears.
  - Confirm reset (`All Categories`) returns to banner state.

## Prevention

- Treat menu interactions as state-machine transitions (default/banner, selected/detail, reset/default).
- Avoid hardcoded fixed offsets for layered nav/popover surfaces.
- Keep component scope clear: banner styling changes should not alter category-state behavior.
- Add a lightweight visual checklist for header popover before merge:
  - default state layout
  - selected-category state layout
  - reset path
  - alignment under scrolled/unscrolled headers

## Related Issues

- `/path/to/components-marketplace/todos/012-pending-p2-match-desktop-category-detail-layout-to-spec.md`
- `/path/to/components-marketplace/todos/013-pending-p2-replace-hardcoded-popover-offsets.md`
