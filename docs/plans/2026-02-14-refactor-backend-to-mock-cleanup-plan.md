---
title: refactor: Backend-to-Mock Migration Cleanup
type: refactor
date: 2026-02-14
---

# Refactor: Backend-to-Mock Migration Cleanup

## Overview

Remove unused files, inconsistent patterns, and legacy configuration remaining from the backend-to-mock migration. The mock system is fully functional but contains cleanup opportunities to improve code quality and maintainability.

## Context

The ECAS e-commerce frontend successfully migrated from an external backend API (`https://dev-backend.ecasmag.ro/ecas`) to a self-contained Nuxt server with mock data. The migration is complete with a functional `MOCK_MODE` toggle system. However, several cleanup opportunities remain:

**What Works**:

- ✅ MOCK_MODE toggle routes requests to `/api/*` for Nitro server mocks
- ✅ 22 server routes providing mock responses for all major features
- ✅ 16 service classes extending `HttpFactory` pattern
- ✅ Centralized API configuration in `plugins/api.ts`

**What Needs Cleanup**:

- ❌ Unused service files from migration
- ❌ Unused dependencies (nuxt-stripe-module)
- ❌ Inconsistent auth header patterns
- ❌ Direct API calls bypassing service layer
- ❌ Stale token capture timing
- ❌ Old backend URL in config fallback

## Critical Questions (Must Answer Before Implementation)

### BLOCKERS (Cannot Proceed Without Answering)

1. **Where is the `apiRequest` function defined?**

   - **Why it matters**: `composables/useCategories.ts` has 8 calls to `apiRequest()` but the function definition is not visible in the visible lines (it may be defined after line 157 or imported).
   - **Action Required**: Search codebase for `apiRequest` definition to understand its error handling, header logic, and response format before refactoring.
   - **Default Plan**: If not found inline, assume it wraps `$fetch` with standard auth headers and error handling.

2. **Which service should handle `/dashboard/client/general/metadata`?**

   - **Why it matters**: Need to create a service method for `TabBar.vue` to call instead of direct `$fetch`.
   - **Action Required**: Verify `services/dashboard/client.service.ts` exists and is imported in `plugins/api.ts`. If not, determine correct service.
   - **Default Plan**: Create `getMetadata()` method in `CustomerDashboard` service.

3. **How should 401 responses be handled globally?**
   - **Why it matters**: After token refactoring, expired/invalid tokens will return 401. Need centralized handling.
   - **Options**:
     - Redirect to login immediately (simplest)
     - Show modal asking user to re-authenticate (better UX)
     - Attempt token refresh if backend supports it (complex)
   - **Default Plan**: Redirect to login immediately with toast message explaining session expired.

### HIGH PRIORITY (Affects UX Significantly)

4. **Should users be warned before auto-logout at 59 minutes?**

   - **Why it matters**: Current implementation (`authStore.ts:109-117`) silently logs out users, potentially disrupting their work.
   - **Options**:
     - Warning modal at 55 minutes (best UX)
     - Countdown timer in header (good UX)
     - Silent logout (simplest, current behavior)
   - **Default Plan**: Keep silent logout for this cleanup (document as known UX limitation).

5. **What should happen to in-flight requests during logout?**

   - **Why it matters**: User clicks logout, but API requests are still pending. They might complete after logout.
   - **Options**:
     - Cancel all pending requests on logout (complex)
     - Let them complete but ignore results (current behavior)
     - Show "logging out..." loading state (medium complexity)
   - **Default Plan**: Let them complete but ignore results (current behavior).

6. **Should we implement token refresh mechanism?**
   - **Why it matters**: Current approach forces re-login after 59 minutes. No refresh token exists.
   - **Options**:
     - Add token refresh logic (requires backend support)
     - Keep current "force re-login" approach (simple)
     - Extend token lifetime (security tradeoff)
   - **Default Plan**: Keep current approach (no refresh, re-login required).

### NICE-TO-HAVE (Improves Clarity)

7. **Should there be a visual indicator of MOCK_MODE?**

   - **Why it matters**: Developers debugging might not know if they're hitting mock or real backend.
   - **Options**:
     - Console log at startup
     - Small badge in footer
     - Nothing (current behavior)
   - **Default Plan**: Add console log at startup showing mode.

8. **How should service method errors be surfaced?**
   - **Why it matters**: Components need to know how to display errors from service methods.
   - **Options**:
     - Throw errors and let components catch (current pattern)
     - Return error objects
     - Use standardized error format
   - **Default Plan**: Keep current pattern (throw errors).

## Technical Analysis

### Unused Files (Safe to Remove)

1. **`services/product.service.ts`** (27 lines)

   - Not imported in `plugins/api.ts`
   - Duplicate of `services/products.service.ts` (plural, 126 lines)
   - No grep references found in codebase

2. **`services/order-summary/cart.service.ts`** (21 lines)

   - Uses inconsistent resource path `/ecas/cart` vs `/cart`
   - Not imported anywhere in codebase
   - Main cart service (`services/cart.service.ts`) already provides functionality

3. **`nuxt-stripe-module`** (package dependency)
   - No runtime imports or API calls found
   - Only type imports exist in 3 locations
   - Mock system handles all payment logic

### Code Quality Issues

#### Auth Header Inconsistency

**Current State**:

- `composables/useFetchAPI.ts:15` → `x-access-token: {value}`
- All services → `Authorization: Bearer {token}`

**Impact**: When `useFetchAPI` is used directly (bypassing services), auth header is inconsistent.

#### Direct API Calls Bypassing Service Layer

**Locations Found**:

1. `services/user.service.ts:15` - Uses `useFetchAPI` directly instead of `this.call()`
2. `components/dashboard/client/TabBar.vue:166` - Direct `$fetch` call
3. `composables/useCategories.ts` - 8 `apiRequest` calls (lines 68, 76, 81, 89, 97, 102, 109, 117)
4. `components/dataTable/RowActions.vue:27-33` - Creates separate fetcher instance

**Impact**: Bypasses centralized MOCK_MODE routing, error handling, and token management.

#### Stale Token Capture

**Problem**:

- `services/user.service.ts:12` - Captures token at construction: `this.token = this.authStore.getToken()`
- `composables/useCategories.ts:25` - Captures token once at module load

**Impact**: Token becomes stale after login/logout - user must refresh page.

#### Old Fallback URL

**File**: `nuxt.config.ts:78`

**Current**:

```typescript
BASE_URL_API: process.env.NUXT_PUBLIC_BASE_URL_API ?? 'https://dev-backend.ecasmag.ro/ecas',
```

**Recommended**:

```typescript
BASE_URL_API: process.env.NUXT_PUBLIC_BASE_URL_API ?? '/api',  // Default to mocks
```

**Impact**: Only affects development if env variable is unset - currently safe (`.env` sets it).

## Proposed Solution

### Phase 1: Safe Removals (Low Risk)

1. Remove unused service files
2. Remove unused dependencies
3. Update imports
4. Run build to verify no compilation errors

### Phase 2: Consistency Refactoring (Medium Risk)

1. Standardize auth headers to `Authorization: Bearer {token}`
2. Refactor direct API calls to use service layer
3. Fix stale token capture (fetch fresh in each method)
4. Update service methods to always retrieve current token

### Phase 3: Configuration Cleanup (Low Risk)

1. Update fallback URL in `nuxt.config.ts`
2. Review and clean up `.env.example` (remove unused Stripe keys if not needed)
3. Document MOCK_MODE behavior

### Phase 4: Testing (Required)

1. Run full test suite (if exists)
2. Manual testing of all user flows in mock mode
3. Verify auth flow (login/logout)
4. Test cart/checkout flow
5. Test dashboard features
6. Build and preview production version

## Implementation Plan

### Phase 1: Safe Removals

**Tasks**:

- [x] Delete `services/product.service.ts`
- [x] Delete `services/order-summary/cart.service.ts`
- [x] Remove `nuxt-stripe-module` from package.json
- [x] Run `npm install` to clean package-lock.json
- [x] Run `npm run lint` to check for unused imports
- [x] Run `npm run build` to verify compilation

**Expected Outcome**: No compilation errors, app runs normally.

### Phase 2: Consistency Refactoring

**Tasks**:

- [ ] Update `composables/useFetchAPI.ts:15`:

  ```typescript
  // Before:
  options.headers['x-access-token'] = cookie.value;

  // After:
  options.headers['Authorization'] = `Bearer ${cookie.value}`;
  ```

- [ ] Refactor `services/user.service.ts`:

  - Remove `this.token = this.authStore.getToken()` at line 12
  - Replace line 15 `useFetchAPI` call with `this.call()`
  - Update line 16 to fetch token fresh: `const token = this.authStore.getToken()`
  - Use token in headers: `{ headers: { Authorization: `Bearer ${token}` } }`

- [ ] Refactor `components/dashboard/client/TabBar.vue:166`:

  - Create new method in `services/dashboard/client.service.ts` for `/dashboard/client/general/metadata`
  - Replace direct `$fetch` call with `$api.customerDashboard.getMetadata()` or similar
  - Delete fetcher creation code at lines 27-33

- [ ] Refactor `composables/useCategories.ts`:

  - Delete `apiRequest` utility function (lines 120-135)
  - Create service methods in existing category-related service
  - Replace all 8 `apiRequest` calls with service calls

- [ ] Refactor `components/dataTable/RowActions.vue`:
  - Delete fetcher creation code (lines 27-33)
  - Use `$api` from Nuxt app for all API calls

**Expected Outcome**: All API calls route through `plugins/api.ts`, consistent auth headers, fresh tokens on every request.

### Phase 3: Configuration Cleanup

**Tasks**:

- [ ] Update `nuxt.config.ts:78`:

  ```typescript
  // Before:
  BASE_URL_API: process.env.NUXT_PUBLIC_BASE_URL_API ?? 'https://dev-backend.ecasmag.ro/ecas',

  // After:
  BASE_URL_API: process.env.NUXT_PUBLIC_BASE_URL_API ?? '/api',
  ```

- [ ] Review `.env.example`:

  - If Stripe is not needed, remove `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=`
  - If Firebase config keys are not used in mock mode, consider adding comment

- [ ] Add `CLEANUP_COMPLETION.md` documenting:
  - What was removed and why
  - Current architecture patterns
  - How to add new features using service layer

**Expected Outcome**: Cleaner configuration, better documentation.

### Phase 4: Testing

**Tasks**:

- [ ] Run `npm run dev`
- [ ] Test auth flow:
  - Register new user
  - Login with existing credentials
  - Logout
  - Verify token is cleared
- [ ] Test browsing:
  - Navigate to products page
  - View product details
  - Search products
- [ ] Test cart:
  - Add item to cart
  - Update quantity
  - Remove item
- [ ] Test checkout:
  - Proceed to checkout
  - Complete mock order
- [ ] Test dashboard:
  - Navigate to customer dashboard
  - View orders
  - Check analytics widgets
- [ ] Run `npm run build`
- [ ] Run `npm run preview`
- [ ] Verify production build works

**Expected Outcome**: All features work correctly in mock mode.

## Alternative Approaches Considered

### Keep Unused Files

**Rejected**: Confusing for future developers, suggests these files might be needed when they're not.

### Leave Direct API Calls

**Rejected**: Undermines MOCK_MODE system, creates inconsistent error handling, harder to add new features.

### Keep Old Fallback URL

**Rejected**: References abandoned backend, misleading, could cause confusion in future development.

## Acceptance Criteria

### Functional Requirements

- [ ] Application compiles without errors
- [ ] Application runs without runtime errors
- [ ] All user flows work in mock mode (auth, browse, cart, checkout, dashboard)
- [ ] Auth tokens are fresh on every API request
- [ ] All API calls route through service layer (no direct bypasses)
- [ ] **Logout→login→account flow works without stale token errors** (CRITICAL)
- [ ] **All 401 responses handled consistently (redirect to login)** (CRITICAL)
- [ ] Multiple simultaneous requests with same token don't fail

### Code Quality Requirements

- [ ] No unused service files
- [ ] No unused dependencies
- [ ] Consistent auth header pattern across all API calls (`Authorization: Bearer {token}`)
- [ ] No stale token capture at construction time
- [ ] Fallback URL points to mock system
- [ ] **No new ESLint errors introduced**
- [ ] **Service layer coverage verified** (grep for direct $fetch bypasses)

### Documentation Requirements

- [ ] Cleanup documented in `CLEANUP_COMPLETION.md`
- [ ] Architecture patterns documented for future reference
- [ ] Environment variables documented
- [ ] **MOCK_MODE behavior documented** (including auto-logout at 59 minutes)

### Performance Requirements

- [ ] Build time unchanged or improved
- [ ] Runtime performance unchanged
- [ ] Bundle size reduced (removed dependencies)

### Edge Case Handling

- [ ] **User logs in, stays for 58 minutes, makes request** → ✅ Token valid, request succeeds
- [ ] **User logs in, stays for 60 minutes, makes request** → ⚠️ Auto-logout, request fails, user redirected to login
- [ ] **User logs in, logs out immediately, logs back in** → ✅ New token used, account data loads correctly
- [ ] **User has 2 tabs open, logs out in Tab A, makes request in Tab B** → ⚠️ Token cleared, Tab B request fails with 401
- [ ] **Network request in progress, user clicks logout** → ⚠️ Request completes but result is ignored

## Dependencies & Risks

### Dependencies

- None (this is a standalone cleanup task)

### Risks

| Risk                                                    | Likelihood | Impact     | Mitigation                               |
| ------------------------------------------------------- | ---------- | ---------- | ---------------------------------------- |
| Direct API call refactoring introduces bugs             | Medium     | Medium     | Thorough testing, keep git history       |
| **Stale token bug causes silent failures after logout** | **High**   | **High**   | **Test logout→login→account flow**       |
| **401 handling unclear**                                | **High**   | **Medium** | **Decide handling strategy first**       |
| **Missing apiRequest function definition**              | **High**   | **Medium** | **Search codebase before refactoring**   |
| Token refactoring breaks auth flow                      | Low        | High       | Test login/logout thoroughly             |
| Removing services breaks hidden imports                 | Low        | Medium     | Run `npm run lint`, grep for imports     |
| Fallback URL change breaks production                   | Very Low   | Low        | `.env` always sets this variable         |
| Concurrent request race conditions                      | Medium     | Low        | Test with multiple simultaneous requests |

### Rollback Strategy

If issues arise after deployment:

| Phase             | Changes                            | Rollback Difficulty | Rollback Time |
| ----------------- | ---------------------------------- | ------------------- | ------------- |
| Phase 1           | Delete 2 files, remove dependency  | ✅ Very easy        | < 5 min       |
| Phase 2           | Token header, 4 API call locations | ⚠️ Medium           | 15-30 min     |
| Phase 3           | Fallback URL change                | ✅ Very easy        | < 5 min       |
| **Full Rollback** | All phases                         | ⚠️ Medium           | 30-60 min     |

**Pre-Rollback Checklist**:

- [ ] Identify which phase caused issues (via monitoring/logs)
- [ ] Verify no users have state dependent on new auth header format
- [ ] Check if backend/mock server supports both header formats (graceful degradation)
- [ ] Announce rollback to team/users if in production

## Success Metrics

- [ ] File count reduced by 2-3 files
- [ ] Bundle size reduced (remove nuxt-stripe-module)
- [ ] Zero compiler warnings
- [ ] Zero ESLint warnings
- [ ] All tests passing (if any exist)
- [ ] All manual test cases passing

## Timeline

**Estimated Effort**: 6-8 hours

- Phase 1: 1-2 hours
- Phase 2: 3-4 hours
- Phase 3: 1 hour
- Phase 4: 1-2 hours

## Future Considerations

### Extensibility

After cleanup, adding new features should follow established patterns:

1. Create service in `/services/` extending `HttpFactory`
2. Add server route in `/server/api/` (if mock mode)
3. Import service in `plugins/api.ts`
4. Use service in components via `$api`

### Monitoring

Consider adding:

- Runtime monitoring of API call patterns
- Detection of direct API calls bypassing service layer
- Token refresh logging

### Documentation

Update onboarding docs to include:

- Service layer pattern explanation
- MOCK_MODE system usage
- How to add new API endpoints

## References & Research

### Internal References

- Service architecture: `plugins/api.ts:44-79`
- Service base class: `composables/HttpFactory.ts`
- Mock mode toggle: `plugins/api.ts:46`
- Server routes: `/server/api/` directory
- Firebase auth: `composables/useFirebaseAuth.ts`

### Related Work

- Migration audit: `ECAS_BACKEND_TO_MOCK_MVP_AUDIT.md`
- Implementation summary: `IMPLEMENTATION_SUMMARY.md`
- Development guidelines: `AGENTS.md`

### External References

- Nuxt Nitro server routes: https://nitro.unjs.io/guide/routes
- Pinia state management: https://pinia.vuejs.org/

## MVP

### Implementation Checklist

**Phase 1: Removals**

- [ ] Delete `services/product.service.ts`
- [ ] Delete `services/order-summary/cart.service.ts`
- [ ] Uninstall `nuxt-stripe-module`
- [ ] Run `npm install`
- [ ] Verify build succeeds

**Phase 2: Refactoring**

- [ ] Update auth header in `composables/useFetchAPI.ts`
- [ ] Refactor `services/user.service.ts` token handling
- [ ] Refactor `components/dashboard/client/TabBar.vue` API call
- [ ] Refactor `composables/useCategories.ts` API calls
- [ ] Refactor `components/dataTable/RowActions.vue` fetcher

**Phase 3: Config**

- [ ] Update fallback URL in `nuxt.config.ts`
- [ ] Review and update `.env.example`
- [ ] Create `CLEANUP_COMPLETION.md`

**Phase 4: Testing**

- [ ] Test auth flow (login/logout)
- [ ] Test browsing flow
- [ ] Test cart/checkout flow
- [ ] Test dashboard features
- [ ] Run production build
- [ ] Verify preview works

### Example Code Changes

#### Removing Unused Service

```bash
# Before:
services/product.service.ts (27 lines, unused)
services/products.service.ts (126 lines, used)

# After:
services/products.service.ts (126 lines, used)
# product.service.ts deleted
```

#### Refactoring Token Capture

```typescript
// services/user.service.ts

// Before (stale token):
constructor() {
    this.token = this.authStore.getToken();
}

async fetchUserData() {
    const { data, error } = await useFetchAPI(`/${this.RESOURCE}`, {
        headers: { Authorization: `Bearer ${this.token}` },
    });
    // ...
}

// After (fresh token):
async fetchUserData() {
    const token = this.authStore.getToken(); // Get fresh token
    const { data, error } = await this.call('GET', `${this.RESOURCE}`, null, {
        headers: { Authorization: `Bearer ${token}` },
    });
    // ...
}
```

#### Refactoring Direct API Call

```vue
<!-- components/dashboard/client/TabBar.vue -->

<!-- Before (direct $fetch): -->
<script setup>
const response = await $fetch(`${config.public.BASE_URL_API}/dashboard/client/general/metadata`, {
  headers: { Authorization: `Bearer ${token}` },
});
</script>

<!-- After (service layer): -->
<script setup>
const response = await $api.customerDashboard.getMetadata();
</script>
```
