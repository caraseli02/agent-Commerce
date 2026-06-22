# Dependency & Security Review Report

**Project:** ECAS (Nuxt 3 E-commerce)  
**Review Date:** 2026-02-12  
**Node.js Version:** 20 (Alpine)  
**Current Nuxt:** 3.14.159

---

## Executive Summary

Your project has **41 security vulnerabilities** (1 critical, 16 high, 18 moderate, 6 low) and **40+ outdated dependencies**. Several major packages require updates with breaking changes that need careful migration planning.

### Risk Assessment: HIGH

- Critical security vulnerability in Koa (Open Redirect)
- Multiple high-severity vulnerabilities in core dependencies
- Firebase 9.x is 3 major versions behind (security & API implications)
- TailwindCSS 3.x approaching end-of-life patterns

---

## Security Vulnerabilities (41 Total)

### Critical (1)

| Package | Severity | Issue                             | Advisory            |
| ------- | -------- | --------------------------------- | ------------------- |
| `koa`   | Critical | Open Redirect via Referrer Header | GHSA-jgmv-j7ww-jx2x |

### High (16)

| Package              | Severity | Issue                                      | Advisory            |
| -------------------- | -------- | ------------------------------------------ | ------------------- |
| `h3`                 | High     | Request Smuggling (TE.TE)                  | GHSA-mp2g-9vg9-f4cg |
| `tar`                | High     | Arbitrary File Overwrite/Symlink Poisoning | GHSA-8qq5-rm4j-mr97 |
| `node-forge`         | High     | ASN.1 vulnerabilities (3 issues)           | Multiple            |
| `devalue`            | High     | Prototype pollution & DoS                  | GHSA-vj54-72f3-p5jv |
| `glob`               | High     | Command injection                          | GHSA-5j98-mcp5-4vw2 |
| `@nuxt/vite-builder` | High     | XSS vulnerability                          | GHSA-2452-6xj8-jh47 |
| `parse-git-config`   | High     | Prototype Pollution                        | GHSA-8g77-54rh-46hx |

### Moderate (18)

- `@babel/helpers` & `@babel/runtime` - RegExp complexity
- `@grpc/grpc-js` - Memory allocation issues
- `@eslint/plugin-kit` - ReDoS vulnerability
- `lodash` - Prototype pollution
- `nanoid` - Predictable results
- `undici` - Insufficient random values
- `esbuild` - Development server security
- `js-yaml` - Prototype pollution
- `nanotar` - Path traversal
- And 9 more...

### Low (6)

- Various transitive dependencies

---

## Outdated Dependencies Analysis

### Major Version Updates (Breaking Changes)

| Package         | Current  | Latest | Risk Level   | Breaking Changes                                        |
| --------------- | -------- | ------ | ------------ | ------------------------------------------------------- |
| **nuxt**        | 3.14.159 | 4.3.1  | **CRITICAL** | Full framework upgrade. Config changes, API changes     |
| **firebase**    | 9.23.0   | 12.9.0 | **HIGH**     | 3 major versions. Auth API changes, modular SDK changes |
| **tailwindcss** | 3.4.15   | 4.1.18 | **HIGH**     | Complete config rewrite required                        |
| **shadcn-nuxt** | 0.11.3   | 2.4.3  | **HIGH**     | Component structure changes                             |
| **pinia**       | 2.2.6    | 3.0.4  | **MEDIUM**   | Store definition changes                                |
| **@pinia/nuxt** | 0.5.5    | 0.11.3 | **MEDIUM**   | Integration changes                                     |
| **eslint**      | 9.15.0   | 10.0.0 | **MEDIUM**   | Config format changes                                   |
| **prettier**    | 2.8.8    | 3.8.1  | **MEDIUM**   | Formatting rule changes                                 |
| **apexcharts**  | 3.54.1   | 5.3.6  | **MEDIUM**   | API changes                                             |
| **date-fns**    | 2.30.0   | 4.1.0  | **MEDIUM**   | Tree-shaking changes                                    |

### Important Minor Updates

| Package           | Current | Latest  | Notes                   |
| ----------------- | ------- | ------- | ----------------------- |
| `@vueuse/core`    | 10.11.1 | 14.2.1  | 4 major versions behind |
| `@vueuse/nuxt`    | 10.11.1 | 14.2.1  | Must update together    |
| `nuxt-swiper`     | 0.1.9   | 2.0.1   | API changes             |
| `nuxt-svgo`       | 3.7.0   | 4.2.6   | Breaking changes        |
| `nuxt-vuefire`    | 0.1.6   | 1.1.0   | Firebase integration    |
| `lucide-vue-next` | 0.323.0 | 0.563.0 | Icon changes            |
| `typescript`      | 5.6.3   | 5.9.3   | Type changes            |
| `zod`             | 3.23.8  | 4.3.6   | Validation changes      |
| `uuid`            | 9.0.1   | 13.0.0  | API changes             |

### Recommended Immediate Updates (Non-Breaking)

These can be safely updated now:

```json
{
  "@formkit/auto-animate": "^0.9.0",
  "@nuxt/eslint": "^1.15.1",
  "@nuxtjs/color-mode": "^4.0.0",
  "@nuxtjs/leaflet": "^1.3.2",
  "@nuxtjs/tailwindcss": "^6.14.0",
  "@tanstack/vue-table": "^8.21.3",
  "@types/lodash": "^4.17.23",
  "@types/uuid": "^10.0.0",
  "@vee-validate/zod": "^4.15.1",
  "@zoom-image/core": "^0.42.0",
  "@zoom-image/vue": "^0.2.32",
  "autoprefixer": "^10.4.24",
  "class-variance-authority": "^0.7.1",
  "embla-carousel-vue": "^8.6.0",
  "lodash": "^4.17.23",
  "nuxt-viewport": "^2.3.1",
  "pinia-plugin-persistedstate": "^4.7.1",
  "postcss": "^8.5.6",
  "radix-vue": "^1.9.17",
  "sass": "^1.97.3",
  "tailwind-merge": "^3.4.0",
  "vee-validate": "^4.15.1",
  "vue3-apexcharts": "^1.10.0"
}
```

---

## Update Strategy

### Phase 1: Security Fixes (Immediate - 1-2 days)

Run automated security fixes:

```bash
# Fix non-breaking security issues
npm audit fix

# Review remaining vulnerabilities
npm audit
```

**Expected Result:** Fixes ~25 of 41 vulnerabilities automatically

### Phase 2: Safe Minor Updates (Week 1)

Update packages without breaking changes:

```bash
# Update non-breaking dependencies
npm update @formkit/auto-animate @nuxtjs/leaflet @nuxtjs/tailwindcss \
  @tanstack/vue-table @types/lodash @types/uuid @vee-validate/zod \
  @zoom-image/core @zoom-image/vue autoprefixer class-variance-authority \
  embla-carousel-vue lodash nuxt-viewport pinia-plugin-persistedstate \
  postcss radix-vue sass tailwind-merge vee-validate vue3-apexcharts

# Verify build
npm run build
npm run lint
```

### Phase 3: Major Updates (Weeks 2-4)

#### 3a. Prettier & TypeScript (Low Risk)

```bash
npm install prettier@^3.8.1 typescript@^5.9.3
# Review formatting changes
npm run pretty
```

#### 3b. VueUse Major Upgrade

```bash
npm install @vueuse/core@^14.2.1 @vueuse/nuxt@^14.2.1
# Check for composable API changes
npm run build
```

#### 3c. Pinia Upgrade

```bash
npm install pinia@^3.0.4 @pinia/nuxt@^0.11.3
# Review store definitions for breaking changes
npm run build
```

#### 3d. Firebase Upgrade (HIGH RISK)

**⚠️ This requires significant code changes**

Firebase v9→v12 has major breaking changes:

- Auth API changes
- Firestore query changes
- Breaking changes in nuxt-vuefire

**Steps:**

1. Create feature branch: `git checkout -b fx_upgrade-firebase`
2. Update packages:
   ```bash
   npm install firebase@^12.9.0 nuxt-vuefire@^1.1.0
   ```
3. Update auth service code
4. Update Firestore queries
5. Test all Firebase features thoroughly

#### 3e. TailwindCSS v4 Upgrade (HIGH RISK)

**⚠️ Requires complete configuration rewrite**

TailwindCSS 4.0 is a complete architectural change:

- No `tailwind.config.js` - uses CSS-based configuration
- Breaking changes in plugin system
- Shadcn components need updates

**Steps:**

1. Create feature branch: `git checkout -b fx_upgrade-tailwind-v4`
2. Follow official migration guide: https://tailwindcss.com/docs/upgrade-guide
3. Update `nuxt.config.ts` postcss configuration
4. Migrate all custom Tailwind config to CSS
5. Update shadcn components
6. Visual regression testing required

#### 3f. Nuxt 4 Upgrade (CRITICAL RISK)

**⚠️ Full framework upgrade - test everything**

Nuxt 3→4 is a major version with:

- App directory structure changes
- API changes
- Module compatibility issues

**Steps:**

1. Create feature branch: `git checkout -b fx_upgrade-nuxt-4`
2. Update nuxt: `npm install nuxt@^4.3.1`
3. Follow migration guide: https://nuxt.com/docs/getting-started/upgrade
4. Update all Nuxt modules
5. Full regression testing

---

## Files to Review/Update

### Configuration Files

- [ ] `nuxt.config.ts` - PostCSS, module configurations
- [ ] `tailwind.config.js` - Will need migration to v4
- [ ] `package.json` - All dependency versions
- [ ] `.eslintrc` - If ESLint 10 changes config format

### Source Code Areas

- [ ] `services/` - Firebase auth calls
- [ ] `composables/` - Any Firebase composables
- [ ] `components/` - Shadcn UI components
- [ ] `store/` - Pinia store definitions
- [ ] `plugins/` - Firebase initialization

### CI/CD

- [ ] `.github/workflows/` - Node version compatibility
- [ ] `.docker/nuxt/Dockerfile` - Currently using Node 20 (compatible)

---

## Dependencies Analysis

### Current Dependency Count

- **Total:** 70+ packages
- **Direct dependencies:** 37
- **Dev dependencies:** 16
- **Outdated:** 40+

### Unused Dependencies Check

Consider auditing for unused packages:

```bash
# Install depcheck globally
npm install -g depcheck

# Run audit
depcheck
```

**Potential candidates for removal:**

- `moment` - Deprecated, use `date-fns` exclusively (already installed)
- `ohmyfetch` - Deprecated, use native `fetch` or `$fetch` from Nuxt

### Duplicated Dependencies

Some packages may have duplicates:

- `date-fns` vs `moment` (choose one)
- Multiple animation libraries (`@formkit/auto-animate`, etc.)

---

## Recommended package.json Changes

### Immediate Updates (Non-Breaking)

```json
{
  "devDependencies": {
    "@nuxt/eslint": "^1.15.1",
    "@nuxtjs/color-mode": "^4.0.0",
    "@nuxtjs/leaflet": "^1.3.2",
    "@types/lodash": "^4.17.23",
    "@types/uuid": "^10.0.0",
    "autoprefixer": "^10.4.24",
    "nuxt": "^3.21.1",
    "postcss": "^8.5.6",
    "sass": "^1.97.3",
    "typescript": "^5.9.3"
  },
  "dependencies": {
    "@formkit/auto-animate": "^0.9.0",
    "@nuxtjs/tailwindcss": "^6.14.0",
    "@tanstack/vue-table": "^8.21.3",
    "@vee-validate/zod": "^4.15.1",
    "@zoom-image/core": "^0.42.0",
    "@zoom-image/vue": "^0.2.32",
    "class-variance-authority": "^0.7.1",
    "embla-carousel-vue": "^8.6.0",
    "lodash": "^4.17.23",
    "nuxt-viewport": "^2.3.1",
    "pinia-plugin-persistedstate": "^4.7.1",
    "radix-vue": "^1.9.17",
    "tailwind-merge": "^3.4.0",
    "vee-validate": "^4.15.1",
    "vue3-apexcharts": "^1.10.0"
  }
}
```

### Node.js Version Recommendation

Current: Node 20 (good, supported until April 2026)  
Consider upgrading to: **Node 22 LTS** (supported until April 2027)

Update in `.docker/nuxt/Dockerfile`:

```dockerfile
FROM node:22-alpine AS base
```

---

## Next Steps

1. **Create a backup branch** before starting: `git checkout -b backup/pre-dependency-update`
2. **Start with Phase 1** (security fixes) immediately
3. **Create separate PRs** for each major update phase
4. **Test thoroughly** after each phase
5. **Update Node.js** to v22 in a separate PR
6. **Consider removing** `moment` and `ohmyfetch`

---

## Resources

- [Nuxt 4 Migration Guide](https://nuxt.com/docs/getting-started/upgrade)
- [TailwindCSS v4 Upgrade](https://tailwindcss.com/docs/upgrade-guide)
- [Firebase v9 to v10+](https://firebase.google.com/docs/web/modular-upgrade)
- [Pinia v3 Changes](https://pinia.vuejs.org/introduction.html)
- [VueUse v11+ Migration](https://vueuse.org/guide/migration.html)

---

_Report generated on 2026-02-12_  
_Node.js: 20.x | Nuxt: 3.14.159 | Vulnerabilities: 41 | Outdated: 40+_
