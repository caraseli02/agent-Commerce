---
status: pending
priority: p2
issue_id: '004'
tags: [demo, ui, empty-states]
dependencies: []
---

# Design Empty States for Dashboard and Lists

## Problem Statement

When dashboard widgets, product lists, or search results are empty, the demo shows bare/minimal empty states. For a portfolio showcase, empty states should be well-designed with illustrations, helpful text, and call-to-actions, not just "No results."

## Findings

**Current State:**

- Product search: Empty results show nothing/minimal text
- Dashboard orders: Empty lists show nothing
- Favorites: Empty lists show nothing
- Categories: Empty categories show nothing

**Missing Empty State Designs:**

- Empty search results illustration
- Empty orders list illustration
- Empty favorites list illustration
- No data available for widgets
- Clear call-to-action buttons
- Helpful explanation text
- "Demo Mode" context badge

**Demo Impact:**

- Low: Empty states feel incomplete/unprofessional
- Medium: Poor user experience during navigation
- Low: Less polished portfolio presentation

## Proposed Solutions

### Option 1: Add Illustrated Empty States

**Approach:**

- Use SVG illustrations or icons for empty states
- Add helpful text explaining what's empty
- Add call-to-action buttons (e.g., "Browse Products", "Place Order")
- Add "Demo Mode" badge explaining limited data
- Create reusable `EmptyState.vue` component
- Apply to all list views and widgets

**Pros:**

- Professional, polished look
- Helpful user guidance
- Shows design skills
- Reusable component pattern

**Cons:**

- Need illustrations or icons
- More development effort
- Multiple locations to update

**Effort:** 3-4 hours

**Risk:** Low

---

### Option 2: Simple Text-Based Empty States

**Approach:**

- Use simple text messages
- Add basic icons (using existing icon system)
- Add clear buttons
- Keep minimal but clear

**Pros:**

- Quick to implement
- Uses existing design elements
- No new illustrations needed
- Minimal code

**Cons:**

- Less visually impressive
- Doesn't showcase illustration/design skills
- May feel generic

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 3: Hide Empty Sections (Showcase Features Only)

**Approach:**

- Remove or hide empty sections from dashboard
- Focus demo on features that have data (products, cart, basic auth)
- Add note explaining demo limitations

**Pros:**

- Simplest to implement
- Avoids empty state design
- Focuses on working features

**Cons:**

- Hides portfolio features
- Less comprehensive showcase
- May look incomplete

**Effort:** 1 hour

**Risk:** Medium (underwhelming showcase)

---

## Recommended Action

**To be filled during triage.** Recommend Option 1 (Illustrated Empty States) for best portfolio impact.

## Technical Details

**Affected files:**

- Create: `components/ui/EmptyState.vue` - Reusable empty state component
- Update: `components/client-table/orders/Index.vue` - Add empty state to orders
- Update: `components/client-table/transaction/Index.vue` - Add empty state to transactions
- Update: `pages/search.vue` - Add empty state to search results
- Update: `components/dashboard/orders/Breadcrumbs.vue` - Add empty state
- Update: `components/global/Favorites.vue` - Add empty state to favorites
- Create: `components/dashboard/empty-illustrations/` - SVG illustrations

**Related components:**

- All table and list components
- Search results pages
- Dashboard widgets
- Favorites section

**No database changes**

## Resources

- **Empty State Inspiration:**

  - https://ui.shadcn.com/docs/components/empty-slot
  - https://www.designsystems.com/empty-states/

- **Illustration Resources:**
  - Undraw: https://undraw.co/illustrations
  - Heroicons: https://heroicons.com/ (already in use)

## Acceptance Criteria

- [ ] Reusable EmptyState component created with props for: illustration, title, description, action button
- [ ] Empty state illustrations created (search, orders, favorites, generic)
- [ ] Search results show empty state with helpful text and "Browse Products" button
- [ ] Dashboard order/transaction lists show empty state with illustration
- [ ] Favorites list shows empty state with helpful guidance
- [ ] Empty states include "Demo Mode" badge explaining limited data
- [ ] Call-to-action buttons navigate to relevant features
- [ ] All empty states are visually consistent
- [ ] Empty states feel helpful and professional

## Work Log

### 2026-02-14 - Initial Assessment

**By:** Portfolio Demo Review

**Actions:**

- Reviewed empty states across demo
- Identified missing designs (search, lists, dashboard)
- Evaluated 3 approaches to empty states
- Researched empty state best practices

**Learnings:**

- Empty states are important for professional demo
- Illustrated empty states with CTAs are most impressive
- Reusable component pattern is good for consistency
- Related to issue #003 (loading states) - both UX improvements

---

## Notes

- **Recommendation:** Option 1 (Illustrated Empty States)
- **Priority:** Medium impact on demo polish
- **Related:** Issue #003 (loading states) - both UX improvements
