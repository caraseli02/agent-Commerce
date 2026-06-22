---
status: pending
priority: p2
issue_id: '003'
tags: [demo, ui, loading-states]
dependencies: []
---

# Add Skeleton Loading States

## Problem Statement

The demo doesn't have skeleton loading states for async data fetching. When navigating between pages or loading data, users see empty or inconsistent UI transitions. For a portfolio showcase, this makes the demo feel less polished and "jumpy."

## Findings

**Current State:**

- Product pages: Load data, show empty space until data arrives
- Dashboard: No loading indicators for widgets
- Search: No loading state while fetching results
- Checkout: No loading states during transitions

**Missing Loading UI:**

- Product card skeletons during catalog load
- Table skeleton for orders/transactions lists
- Widget skeletons for dashboard metrics
- Detail page skeletons for product/user/order pages
- Button loading states during form submissions

**Demo Impact:**

- Low: UI feels "jumpy" and unpolished
- Medium: Poor first impression during initial load
- Low: Less professional portfolio presentation

## Proposed Solutions

### Option 1: Add Shadcn Skeleton Components

**Approach:**

- Use shadcn/ui skeleton components (already available)
- Add skeleton cards for product listings
- Add skeleton table rows for dashboard data
- Add skeleton widgets for dashboard metrics
- Replace loading states with skeletons, show data when ready

**Pros:**

- Matches existing design system
- Professional, modern look
- Easy to implement with existing components
- Consistent styling

**Cons:**

- Need to add skeleton to multiple pages
- Requires managing loading states
- Slightly more complex code

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Use Vuetify or Custom Skeleton Components

**Approach:**

- Create custom skeleton components using Tailwind
- Add shimmer animation effects
- Implement loading overlay components
- Apply across pages as needed

**Pros:**

- Full control over appearance
- Can match exact needs
- Shimmer effects look polished

**Cons:**

- More development effort
- Need to maintain custom components
- May look different from shadcn design system

**Effort:** 4-5 hours

**Risk:** Medium

---

### Option 3: Simple Loading Spinner/Overlay

**Approach:**

- Use simple loading spinner or progress bar
- Add loading overlay for page transitions
- Show during data fetching, hide when data arrives
- Minimal skeleton implementation

**Pros:**

- Simplest to implement
- Quick to add
- Minimal code changes

**Cons:**

- Less polished than skeletons
- Doesn't maintain layout structure
- Less impressive portfolio showcase

**Effort:** 1-2 hours

**Risk:** Low

---

## Recommended Action

**To be filled during triage.** Recommend Option 1 (Shadcn Skeleton Components) for best integration with existing design system.

## Technical Details

**Affected files:**

- `components/skeletons/` - Create skeleton components directory
- Create: `components/skeletons/ProductCardSkeleton.vue` - Product grid skeletons
- Create: `components/skeletons/TableSkeleton.vue` - Table row skeletons
- Create: `components/skeletons/WidgetSkeleton.vue` - Dashboard widget skeletons
- Update: `pages/product/[slug].vue` - Add loading state
- Update: `pages/dashboard/orders/index.vue` - Add table skeleton
- Update: `pages/search.vue` - Add loading state for results

**Related components:**

- Product grids
- Dashboard tables
- Search results
- Product detail pages
- Cart/checkout pages

**No database changes**

## Resources

- **Shadcn UI:** https://ui.shadcn.com/docs/components/skeleton
- **Loading Patterns:** https://www.smashingmagazine.com/2022/03/creating-responsive-skeleton-screens-with-tailwind-css/

## Acceptance Criteria

- [ ] Skeleton components created for: cards, tables, widgets, detail pages
- [ ] Product listing pages show skeleton cards during load
- [ ] Dashboard tables show skeleton rows during load
- [ ] Dashboard widgets show skeleton shapes during load
- [ ] Search results show skeleton during fetch
- [ ] Loading states have shimmer animation or polish
- [ ] Transitions from loading → data are smooth
- [ ] Skeletons match layout structure of content
- [ ] All async data loading has loading states
- [ ] Demo feels polished and professional

## Work Log

### 2026-02-14 - Initial Assessment

**By:** Portfolio Demo Review

**Actions:**

- Reviewed loading states across demo
- Identified missing skeletons (product lists, tables, widgets)
- Evaluated 3 approaches to adding loading states
- Researched shadcn skeleton components

**Learnings:**

- Loading states are important for portfolio polish
- Shadcn skeleton components match existing design system
- Skeletons that match content structure feel most professional
- Related to issue #004 (empty states) - both improve UX polish

---

## Notes

- **Recommendation:** Option 1 (Shadcn Skeleton Components)
- **Priority:** Medium impact on demo polish
- **Related:** Issue #004 (empty states) - both UX improvements
