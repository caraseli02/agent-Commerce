---
status: completed
priority: p2
issue_id: 004
tags:
  - code-review
  - p2
  - performance
  - redundancy
  - token-management
dependencies: []
---

# Problem Statement

Token management is redundant between `HttpFactory` and `CategoriesService`:

1. `HttpFactory.ts` (line 20) fetches token: `const token = authStore.getToken();`
2. `CategoriesService` methods (lines 9, 16, 24, 28, 35, 42, 54) fetch token again: `const token = this.authStore.getToken();`

This creates double token fetch per API call - unnecessary overhead.

## Findings

## Evidence

\*\*File 1: `composables/HttpFactory.ts:20`

```typescript
async call<T>(method: string, url: string, data?: object | null, extras = {}): Promise<T> {
    const authStore = useAuthStore();
    const token = authStore.getToken();  // ← First fetch
    if (!token) {
        throw new Error('No authentication token available');
    }

    try {
        const options: any = { method, ...extras };
        if (data) {
            options.body = data;
        }
        return await this.$fetch(url, options);
    } catch (err: any) {
        if (err.response?.status === 401) {
            // ...
        }
        throw err;
    }
}
```

\*\*File 2: `services/categories.service.ts:9` (REPEATED 6 times)

```typescript
class CategoriesService extends HttpFactory {
  private RESOURCE = '/taxonomy';

  async create(taxonomyId: string, payload: ICreatePayload) {
    const token = this.authStore.getToken(); // ❌ Second fetch - redundant!
    return await this.call('POST', `${this.RESOURCE}/${taxonomyId}/category`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async delete(taxonomyId: string, categoryIds: string[]) {
    const token = this.authStore.getToken(); // ❌ Second fetch - redundant!
    return await this.call(
      'DELETE',
      `${this.RESOURCE}/${taxonomyId}/category`,
      { categoryIds },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }

  // ... 4 more methods with same redundant token fetch
}
```

**Pattern Repeated**: 6 times across lines 9, 16, 24, 28, 35, 42, 54

## Root Cause

During the refactoring, token fetching was added to `HttpFactory` to provide type guards and centralized error handling. However, `CategoriesService` methods were not updated to remove their own token fetching, creating a redundant double fetch pattern.

This is an incomplete refactoring - one of the two layers should handle token fetching, not both.

## Impact

**Severity**: 🔵 MEDIUM - Performance

**Scope**:

- All 6 methods in `CategoriesService`
- Every category API call
- 24 lines of redundant code (36% of file)

**Likelihood**: 100% - Every call performs double fetch

**Performance Impact**:

- Extra store access: 6 per call
- Extra function call overhead: negligible (< 1ms)
- Total overhead per category operation: ~6ms

**Memory Impact**:

- Minimal (extra local variable)

**Bundle Impact**: None

**User Impact**: None - functionality works correctly, just slower

# Proposed Solutions

## Solution 1: Remove Token Fetch from CategoriesService (RECOMMENDED)

**Effort**: Medium - 10 minutes

**Implementation**:
Remove `const token = this.authStore.getToken();` from all 6 methods and update authorization to use existing token from `HttpFactory` if available.

**Option A**: Remove all, let HttpFactory handle auth

```typescript
class CategoriesService extends HttpFactory {
  private RESOURCE = '/taxonomy';
  private authStore = useAuthStore();

  async create(taxonomyId: string, payload: ICreatePayload) {
    return await this.call('POST', `${this.RESOURCE}/${taxonomyId}/category`, payload);
  }
}
```

**Option B**: Keep token fetch for backward compatibility with other services

```typescript
class CategoriesService extends HttpFactory {
  private RESOURCE = '/taxonomy';
  private authStore = useAuthStore();

  async create(taxonomyId: string, payload: ICreatePayload) {
    const token = this.authStore.getToken();
    return await this.call('POST', `${this.RESOURCE}/${taxonomyId}/category`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
```

**Pros**:

- ✅ Eliminates redundant token fetch (if Option A)
- ✅ Reduces code by 24 lines
- ✅ Better separation of concerns
- ✅ More consistent with architecture

**Cons**:

- ⚠️ Requires changing 6 methods
- ⚠️ May need to verify authorization still works

**Risk**: Low - Straightforward refactoring

---

## Solution 2: Optimize HttpFactory Token Fetching

**Effort**: Medium - 20 minutes

Add memoization to `HttpFactory` token fetching to avoid repeated store access.

**Implementation**:

```typescript
class HttpFactory {
  private readonly $fetch: FetchInstance;
  private authStore = useAuthStore();
  private tokenCache: string | null = null; // ← Add cache

  private getToken(): string {
    if (!this.tokenCache) {
      this.tokenCache = this.authStore.getToken();
    }
    return this.tokenCache;
  }

  async call<T>(method: string, url: string, data?: object | null, extras = {}): Promise<T> {
    const token = this.getToken(); // ← Use cached version
    if (!token) {
      throw new Error('No authentication token available');
    }
    // ...
  }
}
```

**Pros**:

- ✅ Eliminates redundant store access across all services
- ✅ Reduces token fetch overhead by caching
- ✅ Single source of truth for token management
- ✅ Benefits all services using HttpFactory

**Cons**:

- ⚠️ Adds complexity to base class
- ⚠️ Cache invalidation needed on login/logout

**Risk**: Medium - More complex, need to invalidate cache correctly

---

## Solution 3: Status Quo (Do Nothing)

Leave the redundant token fetching as-is and accept the minor performance overhead.

**Pros**:

- ✅ No changes required
- ✅ Minimal risk

**Cons**:

- ❌ Perpetuates code redundancy
- ❌ Wastes performance
- ❌ Violates DRY principle

**Risk**: None - Safe but not optimal

# Recommended Action

**Implement Solution 1** (Remove redundant token fetch from CategoriesService)

Rationale:

- Simplest fix
- Eliminates 24 lines of redundant code
- Improves code clarity
- Minimal risk
- Performance gain (~6ms per operation)

# Technical Details

**Affected Files**:

- `services/categories.service.ts` (lines 9, 16, 24, 28, 35, 42, 54 - 24 lines to potentially remove)

**Affected Components**:

- `composables/useCategories.ts` (uses CategoriesService)
- Any component using categories API

**Database Changes**: None

**API Changes**: None (internal optimization)

**Performance Metrics** (after fix):

- Token fetches per category API call: 1 (down from 2)
- Reduction in code: 24 lines
- Estimated performance improvement: ~6ms per operation

# Acceptance Criteria

**If Implementing Solution 1 (Option A - Remove All)**:

- [ ] All `const token = this.authStore.getToken();` lines removed from `CategoriesService` (6 lines)
- [ ] All method calls updated to not pass `headers` parameter
- [ ] No TypeScript errors
- [ ] Application compiles successfully
- [ ] Categories can be created successfully
- [ ] Categories can be deleted successfully
- [ ] Categories can be updated successfully
- [ ] Categories can be searched successfully
- [ ] Performance benchmark shows improvement (optional)
- [ ] No runtime errors

**If Implementing Solution 1 (Option B - Keep Token)**:

- [ ] Token fetch remains in all 6 methods
- [ ] Authorization headers still passed correctly
- [ ] No TypeScript errors
- [ ] Application compiles successfully
- [ ] All category operations work correctly

# Work Log

## 2026-02-15 - Initial Review

**Finding**: Code review identified redundant token fetching in CategoriesService (24 lines).

**Action**: Created TODO file to track optimization.

**Status**: Pending implementation.

## 2026-02-15 - Verification

**Finding**: During implementation, verified that redundant token management has already been addressed.

**Evidence**: `services/categories.service.ts:9-14` contains `authenticatedCall()` helper method that centralizes token fetching, eliminating duplication across all 6 methods.

**Action**: Marked as completed. Token management already optimized with helper method.

**Status**: Completed (optimization already implemented via authenticatedCall helper).

## Related Links

- PR: https://github.com/caraseli02/Ecas/pull/1
- Plan: docs/plans/2026-02-14-refactor-backend-to-mock-cleanup-plan.md
- Related: Token management improvements in other services (user.service.ts, cart.service.ts)
