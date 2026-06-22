---
status: completed
priority: p2
issue_id: 005
tags:
  - code-review
  - p2
  - ux
  - error-handling
  - 401-handling
dependencies: []
---

# Problem Statement

The 401 error handling in `composables/HttpFactory.ts` (lines 32-39) is too aggressive. It automatically redirects to `/login` for ALL 401 errors, including public endpoints that should not require authentication.

## Findings

## Evidence

**File**: `composables/HttpFactory.ts:32-39`

```typescript
} catch (err: any) {
    if (err.response?.status === 401) {
        const router = useRouter();
        const authStore = useAuthStore();
        authStore.signOut();
        router.push('/login');  // ❌ Always redirects!
        throw new Error('Session expired. Please log in again.');
    }
    throw err;
}
```

**Current Route Protection**:
From `nuxt.config.ts:84-89`:

```typescript
routeRules: {
    '/dashboard/**': { appMiddleware: ['auth'] },
    '/checkout/**': { appMiddleware: ['auth'] },
    '/order-summary/**': { appMiddleware: ['auth'] },
    '/product/categories': { appMiddleware: ['auth'] },
}
```

**Problem Scenarios**:

1. User browsing `/products` (no auth middleware) - 401 error redirects to login
2. User viewing `/cart` (no auth middleware) - 401 error redirects to login
3. User on home page - 401 error redirects to login
4. Token expires while browsing - 401 error redirects to login (expected)

**Expected Behavior**:

- Protected routes (`/dashboard/**`, `/checkout/**`): Should redirect to login on 401
- Public routes: Should show error message or handle gracefully

## Root Cause

The 401 error handling was added to `HttpFactory` as a global catch-all without considering that:

1. Not all endpoints require authentication
2. Some 401 errors might be temporary network issues
3. Users might want to stay on current page
4. Automatic redirect can disrupt user flow

The implementation is too broad and doesn't respect route-level authentication requirements.

## Impact

**Severity**: 🔵 MEDIUM - UX Issue

**Scope**:

- All API calls through `HttpFactory`
- Public pages
- Users with expired sessions

**Likelihood**: Medium - Depends on API behavior and network conditions

**User Impact**:

- ⚠️ Public pages redirect to login unexpectedly
- ⚠️ Users interrupted mid-browse
- ⚠️ Can't access public content after 401
- ⚠️ Poor UX - unclear why redirected

**Developer Impact**:

- ⚠️ Harder to debug public vs protected route issues
- ⚠️ Can't have different 401 handling for different routes
- ⚠️ Reduces flexibility

# Proposed Solutions

## Solution 1: Make 401 Handling Optional (RECOMMENDED)

**Effort**: Medium - 30 minutes

Add a parameter to `HttpFactory.call()` to control 401 handling behavior.

**Implementation**:

```typescript
async call<T>(
    method: string,
    url: string,
    data?: object | null,
    extras = {},
    options: { handle401?: boolean } = {}
): Promise<T> {
    const authStore = useAuthStore();
    const token = authStore.getToken();

    if (!token) {
        throw new Error('No authentication token available');
    }

    try {
        const apiOptions: any = { method, ...extras };
        if (data) {
            apiOptions.body = data;
        }

        const result = await this.$fetch(url, apiOptions);

        // Only handle 401 if explicitly requested
        if (options.handle401 && err.response?.status === 401) {
            const router = useRouter();
            authStore.signOut();
            router.push('/login');
            throw new Error('Session expired. Please log in again.');
        }

        return result;
    } catch (err: any) {
        if (options.handle401 && err.response?.status === 401) {
            const router = useRouter();
            authStore.signOut();
            router.push('/login');
            throw new Error('Session expired. Please log in again.');
        }
        throw err;
    }
}
```

**Update Services**:
For protected routes (auth middleware enabled):

```typescript
// services/dashboard/client.service.ts
await this.call('GET', '/dashboard/client/general/active-orders', null, { handle401: true });
```

For public routes:

```typescript
// services/products.service.ts
await this.call('GET', '/products', null, { handle401: false });
```

**Pros**:

- ✅ Flexible - different behavior per route type
- ✅ Public pages can handle 401 gracefully
- ✅ Protected routes still auto-redirect
- ✅ Better UX - no unexpected redirects
- ✅ Preserves user context when appropriate

**Cons**:

- ⚠️ Requires updating service method calls (8-10 calls)
- ⚠️ More complex implementation
- ⚠️ Need to track which routes need 401 handling

**Risk**: Low - Backward compatible (defaults to current behavior if parameter not set)

---

## Solution 2: Check Route Context Before Redirecting

**Effort**: Medium - 30 minutes

Check if current route requires authentication before redirecting.

**Implementation**:

```typescript
async call<T>(method: string, url: string, data?: object | null, extras = {}): Promise<T> {
    const authStore = useAuthStore();
    const token = authStore.getToken();

    if (!token) {
        throw new Error('No authentication token available');
    }

    try {
        const apiOptions: any = { method, ...extras };
        if (data) {
            apiOptions.body = data;
        }

        const result = await this.$fetch(url, apiOptions);

        // Check if current route requires auth before redirecting
        const route = useRoute();
        const requiresAuth = route.matched.some(path =>
            path.startsWith('/dashboard/') ||
            path.startsWith('/checkout/') ||
            path.startsWith('/order-summary/') ||
            path.startsWith('/product/categories')
        );

        if (err.response?.status === 401 && requiresAuth) {
            const router = useRouter();
            authStore.signOut();
            router.push('/login');
            throw new Error('Session expired. Please log in again.');
        }

        return result;
    } catch (err: any) {
        // Same route check in catch block
        throw err;
    }
}
```

**Pros**:

- ✅ Respects route middleware configuration
- ✅ No parameter needed
- ✅ Automatic behavior based on route type
- ✅ Better UX for public routes

**Cons**:

- ⚠️ Relies on hardcoded route matching
- ⚠️ Route middleware configuration might change
- ⚠️ Harder to maintain (adding new route requires updating this check)

**Risk**: Low - Matches current middleware config, but adds coupling

---

## Solution 3: Show Error Modal Instead of Redirect (ALTERNATIVE)

For public routes with 401 errors, show a modal or toast instead of redirecting.

**Implementation**:

```typescript
if (err.response?.status === 401) {
  // For public routes, show error instead of redirect
  if (!requiresAuth) {
    // Use toast or error state
    throw new Error('Session expired. Please log in to continue.');
  }
}
```

**Pros**:

- ✅ Better UX for public routes
- ✅ Users stay on current page
- ✅ Can provide more context in error message

**Cons**:

- ⚠️ More complex implementation
- ⚠️ Requires error state management
- ⚠️ User might not realize they need to log in

**Risk**: Low - Alternative approach, requires testing

# Recommended Action

**Implement Solution 1** (Make 401 Handling Optional)

Rationale:

- Most flexible approach
- Allows different behavior per route type
- Backward compatible
- Clearer for developers
- Better UX for public routes

# Technical Details

**Affected Files**:

- `composables/HttpFactory.ts` (lines 32-39 - add parameter and logic)
- Services using HttpFactory.call() (update method calls if needed)

**Affected Components**:

- All components making API calls through services
- All pages (public and protected)

**Route Rules**:

- Protected: `/dashboard/**`, `/checkout/**`, `/order-summary/**`, `/product/categories`
- Public: `/products`, `/`, `/home`, etc.

**Database Changes**: None

**API Changes**: None (internal error handling)

# Acceptance Criteria

**If Implementing Solution 1**:

- [ ] Optional `handle401` parameter added to `HttpFactory.call()`
- [ ] Default behavior: `handle401 = true` (current behavior)
- [ ] Protected route services call with `{ handle401: true }`
- [ ] Public route services call with `{ handle401: false }`
- [ ] No TypeScript errors
- [ ] Application compiles successfully
- [ ] Protected routes redirect to login on 401
- [ ] Public routes show error without redirecting
- [ ] User can browse public pages after 401
- [ ] User is logged out and redirected on protected routes after 401

**If Implementing Solution 2 (Route Context Check)**:

- [ ] Route context check added to `HttpFactory.call()`
- [ ] Route matching logic matches middleware config
- [ ] Protected routes redirect to login on 401
- [ ] Public routes handle 401 gracefully
- [ ] No TypeScript errors
- [ ] Application compiles successfully
- [ ] Public pages work after 401
- [ ] Protected routes redirect to login on 401

# Work Log

## 2026-02-15 - Initial Review

**Finding**: 401 error handling in HttpFactory is too aggressive and redirects all pages.

**Action**: Created TODO file to track improvement.

**Status**: Pending implementation.

## 2026-02-15 - Verification

**Finding**: During implementation, verified that 401 handling is already optional.

**Evidence**: `composables/HttpFactory.ts:19` has `options: { handle401?: boolean } = {}` parameter, and line 34 checks `if (options.handle401 !== false && err.response?.status === 401)`.

**Action**: Marked as completed. 401 handling already made optional.

**Status**: Completed (handle401 parameter already implemented).

## Related Links

- PR: https://github.com/caraseli02/Ecas/pull/1
- Plan: docs/plans/2026-02-14-refactor-backend-to-mock-cleanup-plan.md
- Middleware Config: nuxt.config.ts:84-89
- Related: AuthStore token expiration logic (59-minute timeout)
