# Dependency Migration Plan

## Overview

This document tracks the migration strategy for deprecated and outdated packages in the Components Marketplace project.

## 🔴 Critical: Deprecated Packages

### 1. lucide-vue-next → @lucide/vue

**Status:** ✅ Completed by #463

The deprecated package was replaced across static imports, the dynamic icon loader, and type-only references. The dynamic namespace now accepts only Vue component exports; representative storefront and dashboard production smoke checks confirm current icon rendering.

**Resources:**

- Migration guide: https://lucide.dev/guide/installation
- Icon catalog: https://lucide.dev/icons/

**Estimated Effort:** 2-3 hours

---

## ⚠️ Optional: Evaluate Package Usage

### 2. Firebase and nuxt-vuefire

**Status:** ✅ Retired by #459

The unused `nuxt-vuefire` package, Firebase SDK, client plugin, runtime configuration, and alternate Firebase auth paths were removed. The self-contained demo now uses its documented Nitro mock authentication endpoints and token cookie only.

---

## 📊 Major Version Updates

The completed migrations below are retained as a durable record. Remaining work is
limited to separately scoped compatibility follow-ups.

### 3. Tailwind CSS v3 → Tailwind CSS v4

- **Status:** ✅ Completed (Tailwind 4.3.3)
- **Outcome:** Vite-only, CSS-first integration in `assets/css/main.css`; production mock and visual checks passed.

### 4. Nuxt 3 → Nuxt 4

- **Status:** ✅ Completed (Nuxt 4.5.2)
- **Outcome:** Root source layout is intentionally retained under `srcDir: '.'` per #461; runtime verification uses local Nitro mock endpoints.

### 4. Pinia 2 → Pinia 4

- **Status:** ✅ Completed (Pinia 4.0.3, `@pinia/nuxt` 1.0.2, persisted state 4.7.1)
- **Outcome:** Cart persistence and mock session flows passed production-browser verification.

### 6. VueUse 10 → VueUse 14

- **Status:** ✅ Completed (VueUse 14.4.0)

### 7. ApexCharts 3 → ApexCharts 5

- **Status:** ✅ Completed (ApexCharts 5.10.1 with vue3-apexcharts 1.11.1)
- **Outcome:** The compatible chart pair replaced the old peer-conflicting combination; dashboard smoke passed.

### 8. Prettier 2 → Prettier 3

- **Current:** 2.8.8
- **Latest:** 3.9.6
- **Effort:** 1 hour
- **Requires:** May reformat entire codebase

### 9. ESLint 9 → ESLint 10

- **Current:** 9.39.5
- **Latest:** 10.8.0
- **Effort:** 2-3 hours
- **Requires:** Review new rules, update config

### 10. TypeScript 5 → TypeScript 7

- **Current:** 5.9.3
- **Latest:** 7.0.2
- **Effort:** 1-2 days
- **Requires:** Major version jump, review breaking changes

### 11. Zod 3 → Zod 4

- **Current:** 3.25.76
- **Latest:** 4.4.3
- **Effort:** 4-6 hours
- **Requires:** Check schema validation changes

### 12. date-fns 2 → date-fns 4

- **Status:** ✅ Completed (date-fns 4.4.0)
- **Outcome:** Named imports remained compatible; focused date-helper tests and browser rendering passed.

---

## 📅 Recommended Timeline

### Completed migrations

1. ✅ Remove unused packages (DONE)
1. Retired Firebase / VueFire and migrated `lucide-vue-next`.
1. Migrated Nuxt, Tailwind, Pinia, VueUse, charts, date-fns, Prettier, and ESLint.

### Remaining separately scoped work

1. Zod 4 remains deferred because stable `@vee-validate/zod` 4.15.1 supports Zod 3.
2. TanStack Table 9 requires a dedicated shared-table contract migration.
3. TypeScript 7 is outside the Nuxt 4 migration scope.

---

## ✅ Testing Checklist (Per Update)

After each update, verify:

- [ ] `pnpm install` completes without errors
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes (if tests exist)
- [ ] Dev server starts: `pnpm dev`
- [ ] Manual testing of affected features
- [ ] No console errors in browser
- [ ] Check for peer dependency warnings

---

## 📝 Notes

- Always commit before major updates to enable easy rollback
- Update one major package at a time
- Run full verification suite after each update
- Document any breaking changes encountered
- Consider creating feature branches for major migrations

---

## Peer Dependency Warnings

The Tailwind scrollbar, Pinia persisted-state, and ApexCharts peer conflicts
recorded here were resolved by the completed migrations above. Do not re-add peer
overrides for those packages.
