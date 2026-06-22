---
status: complete
priority: p1
issue_id: '022'
tags: [code-review, nuxt, shadcn, build, reliability]
dependencies: []
---

# Fix shadcn/ui auto-import name collisions

## Problem Statement

Nuxt build emits many warnings about **two component files resolving to the same name** (e.g. `Button`, `Dialog`, `DropdownMenu`, etc.). This creates ambiguous auto-import resolution and can lead to **runtime crashes** or incorrect component usage (similar to the tooltip collision that caused a 500).

## Findings

- `npm run build` warns about collisions like:
  - `components/ui/button/index.ts` vs `components/ui/button/Button.vue`
  - `components/ui/dialog/index.ts` vs `components/ui/dialog/Dialog.vue`
  - (many more)
- We already hit a real issue of this class: tooltip usage outside provider + naming collision between a global `Tooltip.vue` and Radix/shadcn tooltip components.

## Proposed Solutions

### Option 1: Remove `index.ts` barrel files from auto-import scope

**Approach:** Stop Nuxt components auto-import from treating `components/ui/**/index.ts` as a component export, or relocate these barrels outside `components/`.

**Pros:**

- Eliminates ambiguous resolution at the source
- Keeps Vue SFC components as the canonical auto-import targets

**Cons:**

- Requires updating imports that rely on `index.ts` exports (if any)

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Remove/rename duplicate `.vue` component files

**Approach:** Standardize on one representation per component (either SFC or TS export) and remove the other.

**Pros:**

- Simple conceptually

**Cons:**

- Risky if the TS export is required by shadcn-nuxt expectations
- Could break existing imports

**Effort:** Medium/Large

**Risk:** High

---

### Option 3: Configure Nuxt/shadcn-nuxt to ignore one side

**Approach:** Use module config or Nuxt components config to ignore either `index.ts` or the SFC for auto-import resolution.

**Pros:**

- Minimal code churn

**Cons:**

- Needs careful validation against module behavior

**Effort:** Small/Medium

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Observed in:** `npm run build`

**Related area:** `components/ui/**`

## Acceptance Criteria

- [ ] `npm run build` no longer emits “Two component files resolving to the same name …” warnings for shadcn/ui components
- [ ] No runtime regressions in dialogs/tooltips/buttons
- [ ] Auto-import behavior is deterministic

## Work Log

### 2026-02-22 - Initial Discovery

**By:** Codex

**Actions:**

- Noted build warnings for many duplicated component names (`index.ts` vs `*.vue`)
- Correlated with previously observed tooltip naming/provider crash class

**Learnings:**

- Duplicate component name resolution is a real reliability risk in Nuxt auto-import environments

### 2026-02-22 - Attempted

**By:** Codex

**Actions:**

- Attempted to remove `index.ts` collisions by renaming to `exports.ts`
- Discovered shadcn-nuxt/module resolution expects `components/ui/**/index.ts` to exist; build started emitting ENOENT errors
- Reverted rename to restore working build

### 2026-02-22 - Completed

**By:** Codex

**Actions:**

- Prevented Nuxt auto-components from scanning `components/ui/**` (only `.vue` components under `~/components`, excluding `ui/**`)
- Added `/Users/vladislavcaraseli/Documents/Ecas/modules/shadcn-components-dir-fix.ts` to remove shadcn-injected `components/ui` auto-scan dir
- Verified `npm run build` no longer emits shadcn `index.ts` vs `*.vue` collision warnings
