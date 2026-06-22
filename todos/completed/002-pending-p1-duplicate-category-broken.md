---
status: completed
priority: p1
issue_id: 002
tags:
  - code-review
  - p1
  - broken-feature
  - refactor
dependencies: []
---

# Problem Statement

The `duplicateCategory` function in `composables/useCategories.ts` (lines 104-117) is broken. It:

1. Builds a `url` variable but never uses it
2. Builds a `payload` object but never uses it
3. Calls `$api.categories.get()` instead of performing a duplicate operation
4. Has a misleading name - doesn't actually duplicate anything

This function is called from category UI to duplicate categories but will not work as expected.

# Findings

## Evidence

**File**: `composables/useCategories.ts:104-117`

**Lines 104-108**: Builds unused `url` variable

```typescript
const duplicateCategory = async (sourceId: string, targetId?: string) => {
    const url = targetId  // ❌ Never used!
        ? `/taxonomy/${taxonomyId.value}/category/${sourceId}/copy/${targetId}`
        : `/taxonomy/${taxonomyId.value}/category/${sourceId}/copy`;
```

**Lines 110-114**: Builds unused `payload` object

```typescript
let payload = {};

if (targetId) {
  payload = { parentId: targetId }; // ❌ Never used!
}
```

**Line 115**: Calls wrong API method

```typescript
    const response = await $api.categories.get();  // ❌ Should call duplicate endpoint!
    if (response.status === 'success') await getCategories();
};
```

**Function Purpose (based on name)**:

- Should duplicate a category from `sourceId` to `targetId`
- Or duplicate `sourceId` if no `targetId` provided

**Actual Behavior**:

- Refreshes categories list (`getCategories()`)
- Doesn't perform any duplicate operation
- Ignores `sourceId` and `targetId` parameters

**Interface Definition**:

```typescript
// composables/useCategories.ts:4
export interface ICreatePayload {
  name: string;
  alias?: string;
  aliasType?: string;
  parentId?: string;
  status?: string;
}
```

**Missing API Method**:

```typescript
// services/categories.service.ts:46-54
class CategoriesService extends HttpFactory {
  // No `duplicate()` method defined!
  // Has: create, delete, update, toggleStatus, merge, move
}
```

# Root Cause

The function was likely partially refactored during the service layer migration but not completed. The implementation calls `$api.categories.get()` which refreshes all categories but doesn't actually perform a duplicate operation.

## Impact

**Severity**: 🔴 HIGH - Feature Broken

**Scope**:

- Category duplication feature in UI
- Any user attempting to duplicate categories
- Data integrity (might have expected duplicates that don't exist)

**Likelihood**: 100% - Function will not work as expected

**User Impact**:

- Cannot duplicate categories
- Function executes but doesn't duplicate anything
- Misleading UX (button exists but doesn't work)
- Potential confusion for users

# Proposed Solutions

## Solution 1: Implement Duplicate Endpoint (RECOMMENDED)

**Effort**: Medium - 30 minutes

**Implementation**:
Add duplicate method to `CategoriesService`:

```typescript
async duplicate(taxonomyId: string, sourceIds: string[]) {
    const token = this.authStore.getToken();
    return await this.call('POST', `${this.RESOURCE}/${taxonomyId}/category/duplicate`, { sourceIds }, {
        headers: { Authorization: `Bearer ${token}` },
    });
}
```

Update `composables/useCategories.ts`:

```typescript
const duplicateCategory = async (sourceId: string, targetId?: string) => {
  const sourceIds = targetId ? [sourceId] : undefined;
  const response = await $api.categories.duplicate(taxonomyId.value, sourceIds);
  if (response.status === 'success') await getCategories();
};
```

**Pros**:

- ✅ Feature actually works as intended
- ✅ Proper API pattern
- ✅ Follows service layer architecture

**Cons**:

- ⚠️ Requires mock endpoint update
- ⚠️ Requires backend endpoint (if real API exists)

**Risk**: Medium - Needs new API endpoint

---

## Solution 2: Remove Function (EASIEST)

**Effort**: Small - 5 minutes

Remove `duplicateCategory` function entirely if the feature is not needed or not fully implemented.

**Implementation**:
Delete lines 104-117.

**Pros**:

- ✅ Eliminates broken code
- ✅ No misleading UX
- ✅ Cleaner codebase

**Cons**:

- ⚠️ Loses duplicate functionality (if needed)

**Risk**: Low - Removing non-functional code

---

## Solution 3: Mock Implementation with Copy Logic

**Effort**: Large - 60 minutes

Implement client-side category duplication without backend endpoint by copying the category data and appending " (Copy)" to the name.

**Pros**:

- ✅ No backend changes needed
- ✅ Works with mock mode
- ✅ Immediate UX improvement

**Cons**:

- ⚠️ Complex implementation
- ⚠️ May not match backend behavior

**Risk**: High - Complex logic, harder to test

# Recommended Action

**Implement Solution 1** if the duplicate category feature is required.

**Implement Solution 2** (Remove) if the feature is not needed or is intentionally disabled.

**Decision**: Ask product owner/stakeholder if duplicate category feature is needed before implementing.

Rationale:

- Current implementation is completely broken
- Adding new endpoint requires backend work
- Removing is cleaner if feature isn't needed
- Need to clarify business requirements

# Technical Details

**Affected Files**:

- `composables/useCategories.ts` (lines 104-117 - 14 lines)
- `services/categories.service.ts` (would need new method)

**Affected Components**:

- Category management UI components (that use duplicateCategory function)

**Database Changes**: None

**API Changes**: May need new endpoint for Solution 1

# Acceptance Criteria

**If Implementing Solution 1 (Add Endpoint)**:

- [ ] New `duplicate()` method added to `CategoriesService`
- [ ] Composable updated to call `$api.categories.duplicate()`
- [ ] No TypeScript errors
- [ ] Application compiles successfully
- [ ] Can duplicate category successfully
- [ ] Duplicated category appears in list
- [ ] Original category remains unchanged

**If Implementing Solution 2 (Remove Function)**:

- [ ] Lines 104-117 removed
- [ ] No references to `duplicateCategory` in codebase
- [ ] No TypeScript errors
- [ ] Application compiles successfully
- [ ] Category management UI still works
- [ ] No console errors about missing functions

# Work Log

## 2026-02-15 - Initial Review

**Finding**: Code review identified broken `duplicateCategory` function that doesn't perform duplicate operation.

**Action**: Created TODO file to track fix.

**Status**: Pending implementation decision (add endpoint vs remove function).

## 2026-02-15 - Verification

**Finding**: During implementation, verified that the function has already been removed.

**Evidence**: `composables/useCategories.ts` no longer contains `duplicateCategory` function (lines 104-139 show selectCategory and other functions).

**Action**: Marked as completed. Function already removed.

**Status**: Completed (function already removed).

## Related Links

- PR: https://github.com/caraseli02/Ecas/pull/1
- Plan: docs/plans/2026-02-14-refactor-backend-to-mock-cleanup-plan.md
- Similar Pattern: Other category operations use proper service methods
