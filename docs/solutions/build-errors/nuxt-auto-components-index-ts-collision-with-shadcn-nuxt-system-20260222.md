---
module: System
date: 2026-02-22
problem_type: build_error
component: nuxt-components-autoimport
symptoms:
  - 'Nuxt build warns: Two component files resolving to the same name UiButton (index.ts vs Button.vue) across many shadcn/ui components'
  - 'Auto-import resolution becomes ambiguous and can cause runtime component collisions'
root_cause: configuration
resolution_type: config_fix
severity: high
tags: [nuxt3, shadcn-nuxt, auto-components, build, warnings, ui]
---

# Fix: shadcn/ui `index.ts` vs `*.vue` Component Name Collisions in Nuxt Auto-Components

## Problem

`shadcn-nuxt` generates shadcn/ui components under `components/ui/**` with both:

- `index.ts` (barrel exports), and
- one or more `*.vue` SFC components.

Nuxt auto-components scanning can treat both as “component files”, producing warnings like:

- “Two component files resolving to the same name UiButton … `components/ui/button/index.ts` and `components/ui/button/Button.vue`”

This is more than noise: ambiguous resolution can cause subtle runtime issues (we already hit a real collision class during a tooltip fix when two different `Tooltip` components were competing).

## Root Cause

In `shadcn-nuxt`’s module implementation, it injects `components/ui` into Nuxt component scanning with `extensions: []`:

- `extensions: []` means “scan everything”
- Nuxt then sees both `index.ts` and `*.vue` as candidates for the same resolved component name.

Even if you configure `nuxt.config.ts` component scanning, the module’s injected dir can still re-introduce the collision.

## What Didn’t Work

**Renaming `components/ui/**/index.ts`** (e.g. `index.ts`→`exports.ts`) breaks `shadcn-nuxt`, because the module explicitly reads `dir/index` to discover exported component names.

## Solution

Make Nuxt auto-components scan **only `.vue`** files from `~/components`, and **exclude** `components/ui/**` entirely (we rely on `shadcn-nuxt`’s explicit `addComponent()` registrations for `Ui*` components).

### 1) Restrict Nuxt auto-components scanning

```ts
// /path/to/components-marketplace/nuxt.config.ts
export default defineNuxtConfig({
  components: {
    dirs: [
      {
        path: '~/components',
        extensions: ['vue'],
        ignore: ['ui/**', '**/*.ts'],
      },
    ],
  },
});
```

### 2) Remove `shadcn-nuxt`’s injected scan dir (defensive)

Add a tiny local Nuxt module that filters out the `components/ui` dir injected with `extensions: []`:

```ts
// /path/to/components-marketplace/modules/shadcn-components-dir-fix.ts
export default defineNuxtModule({
  setup(_, nuxt) {
    nuxt.hook('components:dirs', (dirs) => {
      // remove the shadcn-injected `components/ui` dir that scans everything
    });
  },
});
```

Then register it after `shadcn-nuxt` in `nuxt.config.ts`:

```ts
modules: ['shadcn-nuxt', '~/modules/shadcn-components-dir-fix'];
```

## Why This Works

- Nuxt stops scanning `components/ui/**` and all TS files as “components”.
- `shadcn-nuxt` still works because it **explicitly registers** `Ui*` components using `addComponent()` from the `index.ts` exports.
- Build warnings for shadcn `index.ts` vs `*.vue` collisions disappear; component resolution becomes deterministic.

## Verification

- Run `npm run build`
  - Expect: no shadcn “Two component files resolving to the same name Ui…” warnings.
  - (Other unrelated warnings may remain, e.g. SVG name collisions.)

## Prevention / Guidance

- Avoid placing barrel `index.ts` files inside auto-scanned component directories unless you restrict scanning to `.vue`.
- If a Nuxt module injects a `components:dirs` entry with `extensions: []`, treat it as a collision risk and filter it explicitly.
