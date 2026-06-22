---
status: completed
priority: p1
issue_id: 001
tags:
  - code-review
  - security
  - p1
  - runtime-error
dependencies: []
---

# Problem Statement

The `CategoriesService` class in `services/categories.service.ts` will crash at runtime because the `authStore` property is never declared. Every method attempts to call `this.authStore.getToken()` which will throw:

```
TypeError: Cannot read properties of undefined (reading 'getToken')
```

This affects ALL 6 methods in the service, breaking the entire categories functionality.

# Findings

## Evidence

**File**: `services/categories.service.ts`

**Line 9**: Resource constant defined

```typescript
private RESOURCE = '/taxonomy';
```

**Line 16**: First attempt to use undefined `authStore` (will crash)

```typescript
async delete(taxonomyId: string, categoryIds: string[]) {
    const token = this.authStore.getToken();  // ❌ authStore is undefined!
    return await this.call('DELETE', `${this.RESOURCE}/${taxonomyId}/category`, { categoryIds }, {
        headers: { Authorization: `Bearer ${token}` },
    });
}
```

**Line 24**: Second attempt (will crash)

```typescript
async update(taxonomyId: string, categoryId: string, payload: ICreatePayload) {
    const token = this.authStore.getToken();  // ❌ authStore is undefined!
    return await this.call('PATCH', `${this.RESOURCE}/${taxonomyId}/category/${categoryId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
    });
}
```

**Lines 28, 35, 42, 54**: All other methods will crash for same reason

**Pattern Used in Other Services**:
Looking at `services/user.service.ts:11`, `services/cart.service.ts:13`, `services/products.service.ts:12`:

```typescript
class UserService extends HttpFactory {
    private RESOURCE = '/user';
    private authStore = useAuthStore();  // ✅ CORRECT - This is missing!
```

## Root Cause

During refactoring, the token fetching pattern was added but the property declaration was omitted. This is likely a copy-paste error where the pattern was copied from other services but the property declaration line was missed.

## Impact

**Severity**: 🔴 CRITICAL - Blocks Merge

**Scope**:

- All category operations (create, delete, update, toggle status, merge, move)
- Any component using `composables/useCategories.ts`
- API calls to taxonomy endpoints

**Likelihood**: 100% - Will crash on first API call

**User Impact**:

- Categories cannot be created
- Categories cannot be deleted
- Categories cannot be updated
- Categories cannot be searched
- Dashboard category management completely broken

# Proposed Solutions

## Solution 1: Add Missing Property Declaration (RECOMMENDED)

**Effort**: Small - 2 minutes

**Implementation**:
Add this line after `private RESOURCE = '/taxonomy';`:

```typescript
class CategoriesService extends HttpFactory {
    private RESOURCE = '/taxonomy';
    private authStore = useAuthStore();  // ← ADD THIS LINE
```

**Pros**:

- ✅ Fixes all 6 methods simultaneously
- ✅ Follows established pattern from other services
- ✅ Minimal change
- ✅ Zero risk

**Cons**: None

**Risk**: None

---

## Solution 2: Refactor to Not Fetch Token in Methods

**Effort**: Medium - 10 minutes

**Implementation**:
Remove `const token = this.authStore.getToken();` from all 6 methods and let `HttpFactory` handle token management.

**Pros**:

- ✅ Eliminates redundant token fetching
- ✅ Better separation of concerns
- ✅ Consistent with new HttpFactory token handling

**Cons**:

- ⚠️ Requires updating all 6 methods
- ⚠️ Need to verify HttpFactory token handling is complete

**Risk**: Medium - More changes required

---

## Solution 3: Combine Solutions 1 and 2

**Effort**: Medium - 12 minutes

Add property declaration AND remove redundant token fetching from methods.

**Pros**:

- ✅ Fixes crash
- ✅ Eliminates redundancy
- ✅ Best long-term solution

**Cons**: Medium effort

**Risk**: Low - Both changes are straightforward

# Recommended Action

**Implement Solution 1** immediately before merging.

Rationale:

- Fixes the critical runtime error with minimal change
- Follows established patterns
- Can be merged independently of other changes
- Lowest risk option

# Technical Details

**Affected Files**:

- `services/categories.service.ts` (lines 9-64)

**Affected Components**:

- `composables/useCategories.ts` (uses the service)
- Any component importing `useCategories`

**Database Changes**: None

**API Changes**: None (only internal token management)

# Acceptance Criteria

- [ ] `private authStore = useAuthStore();` is added after `private RESOURCE = '/taxonomy';`
- [ ] All 6 methods (`create`, `delete`, `update`, `toggleStatus`, `merge`, `move`) reference `this.authStore`
- [ ] No TypeScript errors
- [ ] Application compiles successfully
- [ ] Can create category without runtime errors
- [ ] Can delete category without runtime errors
- [ ] Can update category without runtime errors
- [ ] Categories are searchable without runtime errors

# Work Log

## 2026-02-15 - Initial Review

**Finding**: Code review identified missing `authStore` property in `CategoriesService` that will cause runtime crash.

**Action**: Created TODO file to track fix.

**Status**: Pending implementation.

## 2026-02-15 - Verification

**Finding**: During implementation, verified that the issue is already fixed.

**Evidence**: `services/categories.service.ts:7` contains `private authStore = useAuthStore();`

**Action**: Marked as completed. No changes needed.

**Status**: Completed (fix already in place).

## Related Links

- PR: https://github.com/caraseli02/Ecas/pull/1
- Plan: docs/plans/2026-02-14-refactor-backend-to-mock-cleanup-plan.md
- Similar Pattern: `services/user.service.ts:11` (correct implementation)

# Resources

- Reference Service: `services/user.service.ts:11` (correct pattern)
- Reference Service: `services/cart.service.ts:13` (correct pattern)
- Reference Service: `services/products.service.ts:12` (correct pattern)
