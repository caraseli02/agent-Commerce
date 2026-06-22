---
status: pending
priority: p2
issue_id: '011'
tags: [code-review, frontend, regression, css]
dependencies: []
---

# Restore Calendar and Leaflet Styles Safely

## Problem Statement

Global stylesheet entries for Leaflet and V-Calendar were removed from Nuxt config to silence 404s, which can regress map/calendar UI rendering where those libraries are used.

## Findings

- `nuxt.config.ts:59-64` no longer includes `leaflet/dist/leaflet.css` and `v-calendar/style.css`.
- Removing global imports hides the loading error but shifts risk to runtime pages that depend on those styles.
- The fix addresses symptom (404) instead of root cause (asset resolution/path/module config).

## Proposed Solutions

### Option 1: Re-add global CSS and fix module/style resolution

**Approach:** Restore both CSS imports and correct upstream source of 404 (package resolution/build config).

**Pros:**

- Preserves expected library visuals.
- Avoids page-level regressions.

**Cons:**

- Requires debugging why imports were 404ing.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Move styles to route/component-level lazy imports

**Approach:** Import Leaflet/V-Calendar styles only where components are mounted.

**Pros:**

- Smaller global CSS footprint.
- Limits blast radius.

**Cons:**

- Must guarantee every usage path imports styles.
- Easy to miss routes.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

## Technical Details

Affected files:

- `/Users/vladislavcaraseli/Documents/Ecas/nuxt.config.ts:59`

## Resources

- Review context: current working tree code review

## Acceptance Criteria

- [ ] Leaflet map pages render with correct marker/layout styles.
- [ ] V-Calendar widgets render with expected base styles.
- [ ] No 404 errors remain for stylesheet assets.
- [ ] Regression screenshots added for map/calendar views.

## Work Log

### 2026-02-18 - Code Review Finding

**By:** Codex

**Actions:**

- Inspected Nuxt config diff and identified removed third-party stylesheet entries.
- Assessed potential downstream UI regression impact.

**Learnings:**

- Style import removal is a risky workaround for unresolved asset loading issues.

## Notes

- Keep this tracked as regression prevention before merge.
