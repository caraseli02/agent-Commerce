# Dependency Migration Plan

## Overview

This document tracks the migration strategy for deprecated and outdated packages in the Components Marketplace project.

## 🔴 Critical: Deprecated Packages

### 1. lucide-vue-next → @lucide/vue (PRIORITY)

**Status:** ⚠️ Package deprecated  
**Current Version:** 0.323.0  
**Target Version:** @lucide/vue (new package)  
**Impact:** HIGH - Used in 20+ component files  
**Breaking Changes:** Package rename, API may differ

**Files Affected:**

- All components using icon imports from 'lucide-vue-next'
- Estimated 20+ files across dashboard, layout, and UI components

**Migration Steps:**

1. Install new package: `pnpm add @lucide/vue`
2. Create a migration script or use find-replace:
   - Find: `from 'lucide-vue-next'`
   - Replace: `from '@lucide/vue'`
3. Test all icon imports still work
4. Verify icon sizes and styling remain consistent
5. Remove old package: `pnpm remove lucide-vue-next`

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

## 📊 Major Version Updates (Future)

These updates require dedicated effort and should be tackled separately:

### 3. Tailwind CSS v3 → Tailwind CSS v4

- **Current:** 3.4.19
- **Target:** 4.x
- **Effort:** 1-2 days
- **Requires:** Refactoring `@apply` directives in SCSS components, migrating theme definitions to `@theme` blocks, updating PostCSS configuration, and verifying all component styles.

### 4. Nuxt 3 → Nuxt 4

- **Current:** 3.21.11
- **Latest:** 4.5.2
- **Effort:** 2-3 days
- **Requires:** Full migration guide review, testing all routes/features

### 4. Pinia 2 → Pinia 4

- **Current:** 2.3.1
- **Latest:** 4.0.2
- **Effort:** 1-2 days
- **Requires:** Review breaking changes, update all stores

### 6. VueUse 10 → VueUse 14

- **Current:** 10.11.1
- **Latest:** 14.4.0
- **Effort:** 4-6 hours
- **Requires:** Review API changes for composables in use

### 7. ApexCharts 3 → ApexCharts 6

- **Current:** 3.54.1
- **Latest:** 6.7.0
- **Effort:** 2-4 hours
- **Requires:** Test all charts still render correctly

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

- **Current:** 2.30.0
- **Latest:** 4.4.0
- **Effort:** 2-3 hours
- **Requires:** Test date formatting in 10+ files

---

## 📅 Recommended Timeline

### Phase 1: Quick Wins (1 week)

1. ✅ Remove unused packages (DONE)
2. Migrate lucide-vue-next → @lucide/vue
3. Evaluate and potentially remove nuxt-vuefire
4. Apply safe patch updates

### Phase 2: Developer Experience (2-3 weeks)

5. Update Prettier 3 (may require codebase reformat)
6. Update ESLint 10
7. Update VueUse 14

### Phase 3: Core Dependencies (1 month)

8. Update Firebase 12
9. Update date-fns 4
10. Update Zod 4
11. Update ApexCharts 6

### Phase 4: Major Framework Updates (2-3 months)

12. Nuxt 4 migration (dedicated sprint)
13. Pinia 4 migration
14. TypeScript 7 migration

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

Current warnings to address:

```
├─┬ tailwind-scrollbar 3.1.0
│ └── ✕ unmet peer tailwindcss@3.x: found 4.3.3
├─┬ pinia-plugin-persistedstate 4.7.1
│ ├── ✕ unmet peer @pinia/nuxt@>=0.10.0: found 0.5.5
│ └── ✕ unmet peer pinia@>=3.0.0: found 2.3.1
└─┬ vue3-apexcharts 1.11.1
  └── ✕ unmet peer apexcharts@>=5.10.0: found 3.54.1
```

These will likely be resolved by updating the related packages in Phase 3 and 4.
