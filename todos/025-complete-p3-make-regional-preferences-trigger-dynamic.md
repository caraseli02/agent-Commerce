---
status: complete
priority: p3
issue_id: '025'
tags: [code-review, ux, i18n, ui]
dependencies: []
---

# Make regional preferences trigger dynamic

## Problem Statement

The header regional preferences trigger label is currently hardcoded (e.g. `EN · Lei`). For demo quality and correctness, it should reflect the user’s selected language/currency.

## Findings

- Trigger lives in `components/layout/header/Index.vue`.
- Label was changed from `| Lei` to `EN · Lei`, but it does not read selection state.

## Proposed Solutions

### Option 1: Bind label to a store/composable

**Approach:** Use the same state used by `LayoutRegionalPreferencesModal` (store or runtime config) to show current language and currency.

**Pros:**

- Correct and consistent

**Cons:**

- Requires identifying the source of truth for preferences

**Effort:** Small

**Risk:** Low

---

### Option 2: Derive from modal selections and emit changes

**Approach:** On save, emit selection and update header state.

**Pros:**

- Localized change

**Cons:**

- Risk of duplicating state

**Effort:** Medium

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Acceptance Criteria

- [ ] Header label matches selected language + currency after saving preferences
- [ ] Works across refresh (persisted source of truth)

## Work Log

### 2026-02-22 - Initial Discovery

**By:** Codex

**Actions:**

- Noted hardcoded label in header trigger

### 2026-02-22 - Completed

**By:** Codex

**Actions:**

- Added persisted `useRegionalPreferencesStore`
- Wired `components/layout/RegionalPreferencesModal.vue` to store
- Made header label computed from store in `components/layout/header/Index.vue`
